import { StylesConfig } from 'react-select';

// Define the shape for react-select options
export interface UserOption {
    value: string;
    label: string;
}

// Custom styles for react-select (used in TaskForm and TaskDetails)
export const selectStyles: StylesConfig<UserOption, true> = {
    control: (provided) => ({
        ...provided,
        borderColor: '#d1d5db', // gray-300
        boxShadow: 'none',
        '&:hover': {
            borderColor: '#a5b4fc', // indigo-300
        },
         minHeight: '34px', // Adjusted height
         paddingLeft: '2px', // Adjusted padding
    }),
    valueContainer: (provided) => ({
        ...provided,
         padding: '0 6px', // Adjusted padding
    }),
    multiValue: (provided) => ({
        ...provided,
        backgroundColor: '#e0e7ff', // indigo-100
    }),
    multiValueLabel: (provided) => ({
        ...provided,
        color: '#3730a3', // indigo-800
         fontSize: '0.875rem', // Match sm text size
    }),
    multiValueRemove: (provided) => ({
        ...provided,
        color: '#4338ca', // indigo-700
        '&:hover': {
            backgroundColor: '#c7d2fe', // indigo-200
            color: '#312e81', // indigo-900
        },
    }),
    input: (provided) => ({
        ...provided,
        margin: '0px',
        paddingBottom: '0px',
         paddingTop: '0px',
    }),
    indicatorsContainer: (provided) => ({
        ...provided,
         height: '34px', // Adjusted height
    }),
    option: (provided, state) => ({
        ...provided,
         backgroundColor: state.isFocused ? '#eef2ff' : state.isSelected ? '#e0e7ff' : '#ffffff', // Focused and selected styles
        color: '#1f2937',
        fontSize: '0.875rem', // Match sm text size
         paddingTop: '6px', // Adjust vertical padding
         paddingBottom: '6px',
    }),
    placeholder: (provided) => ({
         ...provided,
         fontSize: '0.875rem', // Match sm text size
         color: '#6b7280', // gray-500
     }),
     menu: (provided) => ({
         ...provided,
         zIndex: 20, // Ensure menu appears above other elements if needed
     }),
};