// ProjectSettings.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase/client';

export const ProjectSettings = () => {
  // Get projectId from the URL parameters
  const { projectId } = useParams();
  console.log('Project ID from URL:', projectId);

  // State for holding custom fields
  const [customFields, setCustomFields] = useState([]);
  // State for holding the new custom field information
  const [newField, setNewField] = useState({ name: '', type: 'text', options: '' });
  // State for loading indication
  const [loading, setLoading] = useState(false);
  // State for tracking which field is in edit mode (by field ID)
  const [editingField, setEditingField] = useState(null);
  // State for holding the project name
  const [projectName, setProjectName] = useState('');

  // Fetch project details and custom fields on component mount and when projectId changes
  useEffect(() => {
    if (projectId) {
      // Fetch the project details from the database
      fetchProjectDetails();
      // Fetch the custom fields from the database
      fetchCustomFields();

      // Subscribe to real-time changes on the custom_fields table
      const subscription = supabase
        .channel('custom-fields-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'custom_fields' },
          (payload) => {
            console.log('Real-time change detected:', payload);

            // Handle INSERT events: add the new custom field if it matches the current project
            if (payload.eventType === 'INSERT' && payload.new.project_id === projectId) {
              console.log('New custom field inserted:', payload.new);
              setCustomFields((prev) => [...prev, payload.new]);
            }

            // Handle DELETE events: remove the custom field from state
            if (payload.eventType === 'DELETE') {
              console.log('Custom field deleted:', payload.old);
              setCustomFields((prev) =>
                prev.filter((field) => field.id !== payload.old.id)
              );
            }

            // Handle UPDATE events: update the custom field details in state if it belongs to the current project
            if (payload.eventType === 'UPDATE' && payload.new.project_id === projectId) {
              console.log('Custom field updated:', payload.new);
              setCustomFields((prev) =>
                prev.map((field) =>
                  field.id === payload.new.id ? payload.new : field
                )
              );
            }
          }
        )
        .subscribe();

      // Clean up the subscription when the component unmounts
      return () => {
        console.log('Removing real-time subscription for custom fields.');
        supabase.removeChannel(subscription);
      };
    } else {
      console.error('No projectId provided in URL.');
    }
  }, [projectId]);

  // Function to fetch project details from the database
  const fetchProjectDetails = async () => {
    try {
      console.log('Fetching project details for projectId:', projectId);

      const { data, error } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('Error fetching project details:', error);
        throw error;
      }

      console.log('Fetched project details:', data);
      setProjectName(data.name);
    } catch (error) {
      console.error('Error in fetchProjectDetails:', error);
    }
  };

  // Function to fetch custom fields from the database
  const fetchCustomFields = async () => {
    try {
      setLoading(true);
      console.log('Fetching custom fields for projectId:', projectId);

      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching custom fields:', error);
        throw error;
      }

      console.log('Fetched custom fields:', data);
      setCustomFields(data || []);
    } catch (error) {
      console.error('Error in fetchCustomFields:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to add a new custom field
  const handleAddField = async () => {
    try {
      console.log('Adding new custom field with data:', newField);
      if (!newField.name) {
        alert('Field name is required.');
        return;
      }

      // Prepare options for a dropdown type; store as JSON if needed
      const optionsValue =
        newField.type === 'dropdown'
          ? JSON.stringify(newField.options.split(','))
          : null;

      const { error } = await supabase.from('custom_fields').insert([
        {
          project_id: projectId,
          name: newField.name,
          type: newField.type,
          options: optionsValue,
        },
      ]);

      if (error) {
        console.error('Error adding custom field:', error);
        throw error;
      }

      console.log('Custom field added successfully.');
      // Clear the newField state after successful addition
      setNewField({ name: '', type: 'text', options: '' });
    } catch (error) {
      console.error('Error in handleAddField:', error);
    }
  };

  // Function to delete a custom field by its ID
  const handleDeleteField = async (fieldId) => {
    try {
      console.log('Deleting custom field with ID:', fieldId);
      const { error } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', fieldId);

      if (error) {
        console.error('Error deleting custom field:', error);
        throw error;
      }
      console.log('Custom field deleted successfully.');
    } catch (error) {
      console.error('Error in handleDeleteField:', error);
    }
  };

  // Function to save an edited custom field name
  const handleEditField = async (fieldId, updatedName) => {
    try {
      console.log(`Updating custom field ${fieldId} with new name: ${updatedName}`);
      const { error } = await supabase
        .from('custom_fields')
        .update({ name: updatedName })
        .eq('id', fieldId);

      if (error) {
        console.error('Error editing custom field:', error);
        throw error;
      }
      console.log('Custom field updated successfully.');
      // Exit edit mode after saving changes
      setEditingField(null);
    } catch (error) {
      console.error('Error in handleEditField:', error);
    }
  };

  // Enter edit mode for a field
  const handleEditClick = (field) => {
    console.log('Editing field:', field);
    setEditingField(field.id);
  };

  // Handle the change in input value while editing a custom field name
  const handleEditInputChange = (e, fieldId) => {
    const newValue = e.target.value;
    console.log(`Field ID ${fieldId} changed to:`, newValue);
    // Update the state for customFields locally
    setCustomFields((prev) =>
      prev.map((field) =>
        field.id === fieldId ? { ...field, name: newValue } : field
      )
    );
  };

  // If projectId is missing, render an error message
  if (!projectId) {
    return <div>Error: Project ID is missing in the URL.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Project Settings for {projectName}</h1>

      <div>
        <h2 className="text-lg font-semibold mb-2">Custom Fields</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <ul className="space-y-4">
            {customFields.map((field) => (
              <li key={field.id} className="flex justify-between items-center">
                <div>
                  {editingField === field.id ? (
                    // If the field is in edit mode, render an input for editing the name
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => handleEditInputChange(e, field.id)}
                      className="border p-2"
                    />
                  ) : (
                    // Otherwise, just display the field name
                    <p className="font-medium">{field.name}</p>
                  )}
                  <p className="text-sm text-gray-600">Type: {field.type}</p>
                </div>
                <div className="flex space-x-2">
                  {editingField === field.id ? (
                    // Render a Save button when in edit mode
                    <button
                      onClick={() => handleEditField(field.id, field.name)}
                      className="text-green-500 hover:underline"
                    >
                      Save
                    </button>
                  ) : (
                    // Render an Edit button otherwise
                    <button
                      onClick={() => handleEditClick(field)}
                      className="text-blue-500 hover:underline"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteField(field.id)}
                    className="text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Add New Field</h3>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Field Name"
            value={newField.name}
            onChange={(e) =>
              setNewField({ ...newField, name: e.target.value })
            }
            className="border p-2 w-full"
          />
          <select
            value={newField.type}
            onChange={(e) =>
              setNewField({ ...newField, type: e.target.value })
            }
            className="border p-2 w-full"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="dropdown">Dropdown</option>
          </select>
          {newField.type === 'dropdown' && (
            <input
              type="text"
              placeholder="Options (comma-separated)"
              value={newField.options}
              onChange={(e) =>
                setNewField({ ...newField, options: e.target.value })
              }
              className="border p-2 w-full"
            />
          )}
        </div>
        <button
          onClick={handleAddField}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Add Field
        </button>
      </div>
    </div>
  );
};
