// backend/controllers/segmentController.js
const Segment = require('../models/Segment');
const Customer = require('../models/Customer');
const mongoose = require('mongoose');

const translateRulesToMongoQuery = (ruleGroups) => {
    console.log("Translating rules input:", JSON.stringify(ruleGroups, null, 2));
    if (!ruleGroups || (Array.isArray(ruleGroups) && ruleGroups.length === 0)) {
        console.log("No rule groups provided or empty array, returning empty query for 'match all/none'.");
        return {};
    }

    const groupsToParse = Array.isArray(ruleGroups) ? ruleGroups : [ruleGroups];

    const parseGroup = (group) => {
        if (!group || group.type !== 'group' || !group.rules || group.rules.length === 0) {
            console.warn("Skipping invalid or empty group:", group);
            return null;
        }
        
        const conditions = group.rules.map(item => {
            if (item.type === 'rule') {
                let condition = {};
                let value = item.value;

                const numericFields = ['totalSpends', 'visitCount'];
                const dateOffsetOperators = ['inactive_for_days_g', 'inactive_for_days_le'];

                if (numericFields.includes(item.field)) {
                    if (value === '' || value === null || value === undefined) {
                        console.warn(`Empty value for numeric rule ${item.id} field ${item.field}. Skipping rule.`);
                        return null; 
                    }
                    value = Number(value);
                    if (isNaN(value)) {
                        console.warn(`Invalid number value for rule ${item.id} field ${item.field}: '${item.value}'. Skipping rule.`);
                        return null;
                    }
                } else if (dateOffsetOperators.includes(item.operator)) {
                     if (value === '' || value === null || value === undefined) {
                        console.warn(`Empty value for date_offset rule ${item.id} field ${item.field}. Skipping rule.`);
                        return null;
                    }
                    value = parseInt(value); 
                    if (isNaN(value)) {
                        console.warn(`Invalid number for days offset in rule ${item.id} field ${item.field}: '${item.value}'. Skipping rule.`);
                        return null;
                    }
                } else if (item.field === 'tags') {
                    if (typeof value !== 'string' || value.trim() === '') {
                        console.warn(`Empty or invalid value for tags rule ${item.id}: '${item.value}'. Skipping rule.`);
                        return null;
                    }
                    value = String(value).trim();
                }
                
                switch (item.operator) {
                    case '>': condition[item.field] = { $gt: value }; break;
                    case '<': condition[item.field] = { $lt: value }; break;
                    case '=': condition[item.field] = { $eq: value }; break;
                    case '>=': condition[item.field] = { $gte: value }; break;
                    case '<=': condition[item.field] = { $lte: value }; break;
                    case 'contains': 
                        if (item.field === 'tags') {
                            condition[item.field] = { $elemMatch: { $regex: value, $options: 'i' } };
                        } else { 
                            condition[item.field] = { $regex: value, $options: 'i' };
                        }
                        break;
                    case 'not_contains': 
                        if (item.field === 'tags') {
                            condition[item.field] = { $not: { $elemMatch: { $regex: value, $options: 'i' } } };
                        } else {
                            condition[item.field] = { $not: { $regex: value, $options: 'i' } };
                        }
                        break;
                    case 'equals': 
                        if (item.field === 'tags') {
                            condition[item.field] = value; 
                        } else {
                            condition[item.field] = { $eq: value };
                        }
                        break;
                    case 'inactive_for_days_g': 
                        const dateGT = new Date();
                        dateGT.setDate(dateGT.getDate() - value); 
                        condition[item.field] = { $lt: dateGT }; 
                        break;
                    case 'inactive_for_days_le': 
                        const dateLE = new Date();
                        dateLE.setDate(dateLE.getDate() - value);
                        condition[item.field] = { $gte: dateLE }; 
                        break;
                    default:
                        console.warn(`Unknown operator: ${item.operator} for field ${item.field}`);
                        return null;
                }
                return condition;
            } else if (item.type === 'group') {
                return parseGroup(item); 
            }
            return null; 
        }).filter(c => c !== null && Object.keys(c).length > 0); 

        if (conditions.length === 0) { return null; }
        return group.logic === 'OR' ? { $or: conditions } : { $and: conditions };
    };
    
    const finalConditions = groupsToParse.map(parseGroup).filter(c => c !== null);

    if (finalConditions.length === 0) {
        if (groupsToParse.length > 0 && groupsToParse.some(g => g && g.rules && g.rules.length > 0)) {
          console.warn("No valid MongoDB conditions generated from the provided rule groups. Query will effectively match all documents or none.");
        }
        return {};
    }
    
    if (finalConditions.length === 1) {
        return finalConditions[0]; 
    }
    return { $and: finalConditions }; 
};

exports.previewSegmentAudience = async (req, res) => {
    try {
        const { rulesDefinition } = req.body; 
        if (!rulesDefinition || !Array.isArray(rulesDefinition)) {
            return res.status(400).json({ success: false, message: 'Rules definition is required and must be an array of groups.' });
        }

        const mongoQuery = translateRulesToMongoQuery(rulesDefinition);
        console.log("MongoDB Query for preview:", JSON.stringify(mongoQuery, null, 2));
        
        const isEmptyQueryFromEmptyRules = Object.keys(mongoQuery).length === 0 && 
                                           rulesDefinition.every(group => !group.rules || group.rules.length === 0 || group.rules.every(rule => rule.value === '' || rule.value === null || rule.value === undefined));

        const audienceSize = isEmptyQueryFromEmptyRules
                           ? await Customer.countDocuments({})
                           : await Customer.countDocuments(mongoQuery);

        res.status(200).json({ success: true, audienceSize });
    } catch (error) {
        console.error('Error previewing segment audience:', error);
        res.status(500).json({ success: false, message: 'Server error during audience preview.', error: error.message });
    }
};

exports.createSegment = async (req, res) => {
    try {
        const { name, rulesDefinition } = req.body;
        if (!name || !rulesDefinition || !Array.isArray(rulesDefinition) || rulesDefinition.length === 0) {
            return res.status(400).json({ success: false, message: 'Segment name and a valid rules definition (non-empty array of groups) are required.' });
        }

        const mongoQuery = translateRulesToMongoQuery(rulesDefinition);
        console.log("MongoDB Query for segment creation:", JSON.stringify(mongoQuery, null, 2));
        
        const isEmptyQueryFromEmptyRules = Object.keys(mongoQuery).length === 0 && 
                                           rulesDefinition.every(group => !group.rules || group.rules.length === 0 || group.rules.every(rule => rule.value === '' || rule.value === null || rule.value === undefined));

        const audienceSize = isEmptyQueryFromEmptyRules
                           ? await Customer.countDocuments({})
                           : await Customer.countDocuments(mongoQuery);

        const segment = await Segment.create({ 
            name, 
            rules: rulesDefinition, 
            lastCalculatedAudienceSize: audienceSize 
        });

        console.log(`Segment ${segment.name} created with audience size ${audienceSize}. Campaign initiation placeholder...`);
        
        res.status(201).json({ 
            success: true, 
            message: 'Segment created successfully. Campaign initiation placeholder.', 
            segmentId: segment._id,
            audienceSize: audienceSize 
        });
    } catch (error) {
        console.error('Error creating segment:', error);
        if (error.name === 'ValidationError') {
             return res.status(400).json({ success: false, message: 'Validation Error creating segment.', errors: error.errors });
        }
        res.status(500).json({ success: false, message: 'Server error during segment creation.', error: error.message });
    }
};