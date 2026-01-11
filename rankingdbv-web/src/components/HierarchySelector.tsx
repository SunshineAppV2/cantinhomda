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
        districts: []
    });

    useEffect(() => {
        api.get('/clubs/hierarchy-options')
            .then(res => setOptions(res.data))
            .catch(err => console.error('Error fetching hierarchy options:', err));
    }, []);

    const handleChange = (field: keyof HierarchyState, val: string) => {
        const newValue = { ...value, [field]: val };

        // Reset children for major changes if needed, 
        // but for free-text autocomplete user might expect less aggressive resetting
        if (field === 'union') {
            newValue.association = '';
            newValue.mission = '';
            newValue.region = '';
            newValue.district = '';
        } else if (field === 'association' || field === 'mission') {
            newValue.association = val;
            newValue.mission = val;
        }

        onChange(newValue);
    };

    return (
        <div className="grid grid-cols-1 gap-4">
            <AutocompleteInput
                label="União"
                value={value.union}
                onChange={(val) => handleChange('union', val)}
                suggestions={options.unions}
                placeholder="Selecione ou digite..."
                readOnly={readOnly}
            />

            <AutocompleteInput
                label="Associação / Missão"
                value={value.association || value.mission}
                onChange={(val) => handleChange('association', val)}
                suggestions={options.associations}
                placeholder="Selecione ou digite..."
                readOnly={readOnly}
            />

            <AutocompleteInput
                label="Região"
                value={value.region}
                onChange={(val) => handleChange('region', val)}
                suggestions={options.regions}
                placeholder="Ex: 5ª Região"
                readOnly={readOnly}
            />

            <AutocompleteInput
                label="Distrito"
                value={value.district}
                onChange={(val) => handleChange('district', val)}
                suggestions={options.districts}
                placeholder="Ex: Central"
                readOnly={readOnly}
            />
        </div>
    );
}
