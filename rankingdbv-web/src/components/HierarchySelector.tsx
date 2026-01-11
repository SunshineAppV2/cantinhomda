import { useState, useEffect } from 'react';
import { api } from '../lib/axios';
import { AutocompleteInput } from './AutocompleteInput';

interface HierarchyState {
    union: string;
    association: string;
    region: string;
    district: string;
    mission: string; // Alias for association/mission
}

interface HierarchySelectorProps {
    value: HierarchyState;
    onChange: (value: HierarchyState) => void;
    readOnly?: boolean;
}

export function HierarchySelector({ value, onChange, readOnly = false }: HierarchySelectorProps) {
    const [options, setOptions] = useState<any>({
        unions: [],
        associations: [],
        regions: [],
        districts: [],
        hierarchyTree: {}
    });

    useEffect(() => {
        api.get('/clubs/hierarchy-options')
            .then(res => setOptions(res.data))
            .catch(err => console.error('Error fetching hierarchy options:', err));
    }, []);

    const handleChange = (field: keyof HierarchyState, val: string) => {
        const newValue = { ...value, [field]: val };

        // Auto-clear children when parent changes
        if (field === 'union') {
            newValue.association = '';
            newValue.mission = '';
            newValue.region = '';
            newValue.district = '';
        } else if (field === 'association' || field === 'mission') {
            newValue.association = val;
            newValue.mission = val;
            newValue.region = '';
            newValue.district = '';
        } else if (field === 'region') {
            newValue.district = '';
        }

        onChange(newValue);
    };

    // Helper to extract keys from tree safely
    const getKeys = (obj: any) => obj ? Object.keys(obj).sort() : [];

    // Compute Suggestions based on selection path
    const unionSuggestions = options.unions || [];

    // Association: Show children of selected Union (if in tree), else fallback to all DB associations
    const associationSuggestions = (value.union && options.hierarchyTree?.[value.union])
        ? getKeys(options.hierarchyTree[value.union])
        : options.associations || [];

    // Region: Show children of selected Association (if in tree), else fallback to all DB regions
    const regionSuggestions = (value.union && value.association && options.hierarchyTree?.[value.union]?.[value.association])
        ? getKeys(options.hierarchyTree[value.union][value.association])
        : options.regions || [];

    // District: Show children of selected Region (if in tree), else fallback to all DB districts
    // Note: The tree might store districts as arrays or objects, let's check backend structure. 
    // Backend `getHierarchyTree` says: tree[u][m][r][d] is an ARRAY of clubs.
    // Wait, HIERARCHY_DATA structure in backend `hierarchy.data.ts` ?
    // I don't see `hierarchy.data.ts`. I only saw `getHierarchyTree` usage.
    // In `ClubsService.getHierarchyOptions`, it returns `HIERARCHY_DATA`.
    // Assuming HIERARCHY_DATA is: { "Union": { "Association": { "Region": ["District1", "District2"] } } }
    // OR { "Union": { "Association": { "Region": { "District": [] } } } }

    // Let's assume standard object nesting keys until District, which might be array of strings or object keys.
    // Safest is to check if it's array or object.
    const getDistrictSuggestions = () => {
        if (!value.union || !value.association || !value.region || !options.hierarchyTree)
            return options.districts || [];

        const regionNode = options.hierarchyTree[value.union]?.[value.association]?.[value.region];

        if (Array.isArray(regionNode)) {
            // If it's an array of strings, return it
            return regionNode.sort();
        } else if (typeof regionNode === 'object') {
            // If it's an object, return keys
            return getKeys(regionNode);
        }

        return options.districts || [];
    };

    const districtSuggestions = getDistrictSuggestions();

    return (
        <div className="grid grid-cols-1 gap-4">
            <AutocompleteInput
                label="União"
                value={value.union}
                onChange={(val) => handleChange('union', val)}
                suggestions={unionSuggestions}
                placeholder="Selecione ou digite..."
                readOnly={readOnly}
            />

            <AutocompleteInput
                label="Associação / Missão"
                value={value.association || value.mission}
                onChange={(val) => handleChange('association', val)}
                suggestions={associationSuggestions}
                placeholder="Selecione ou digite..."
                readOnly={readOnly}
            />

            <AutocompleteInput
                label="Região"
                value={value.region}
                onChange={(val) => handleChange('region', val)}
                suggestions={regionSuggestions}
                placeholder="Ex: 5ª Região"
                readOnly={readOnly}
            />

            <AutocompleteInput
                label="Distrito"
                value={value.district}
                onChange={(val) => handleChange('district', val)}
                suggestions={districtSuggestions}
                placeholder="Ex: Central"
                readOnly={readOnly}
            />
        </div>
    );
}
