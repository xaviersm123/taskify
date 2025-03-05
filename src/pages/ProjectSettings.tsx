// ProjectSettings.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase/client';

export const ProjectSettings = () => {
  const { projectId } = useParams();
  console.log('Project ID from URL:', projectId);

  const [customFields, setCustomFields] = useState([]);
  const [newField, setNewField] = useState({ name: '', type: 'text', options: '' });
  const [loading, setLoading] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
      fetchCustomFields();

      const subscription = supabase
        .channel('custom-fields-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'custom_fields' },
          (payload) => {
            console.log('Real-time change detected:', payload);
            if (payload.eventType === 'INSERT' && payload.new.project_id === projectId) {
              console.log('New custom field inserted:', payload.new);
              setCustomFields((prev) => [...prev, payload.new]);
            }
            if (payload.eventType === 'DELETE') {
              console.log('Custom field deleted:', payload.old);
              setCustomFields((prev) =>
                prev.filter((field) => field.id !== payload.old.id)
              );
            }
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

      return () => {
        console.log('Removing real-time subscription for custom fields.');
        supabase.removeChannel(subscription);
      };
    } else {
      console.error('No projectId provided in URL.');
    }
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      console.log('Fetching project details for projectId:', projectId);
      const { data, error } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      console.log('Fetched project details:', data);
      setProjectName(data.name);
    } catch (error) {
      console.error('Error in fetchProjectDetails:', error);
    }
  };

  const fetchCustomFields = async () => {
    try {
      setLoading(true);
      console.log('Fetching custom fields for projectId:', projectId);
      const { data, error } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      console.log('Fetched custom fields:', data);
      setCustomFields(data || []);
    } catch (error) {
      console.error('Error in fetchCustomFields:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = async () => {
    try {
      console.log('Adding new custom field with data:', newField);
      if (!newField.name) {
        alert('Field name is required.');
        return;
      }

      const optionsValue =
        newField.type === 'select'
          ? JSON.stringify(newField.options.split(',').map(opt => opt.trim()))
          : null;

      const fieldData = {
        project_id: projectId,
        name: newField.name,
        type: newField.type,
        options: optionsValue,
      };
      console.log('Inserting into custom_fields:', fieldData);

      const { error } = await supabase.from('custom_fields').insert([fieldData]);

      if (error) throw error;

      console.log('Custom field added successfully.');
      setNewField({ name: '', type: 'text', options: '' });
    } catch (error) {
      console.error('Error in handleAddField:', error);
      alert('Failed to add custom field: ' + error.message);
    }
  };

  const handleDeleteField = async (fieldId) => {
    try {
      console.log('Deleting custom field with ID:', fieldId);
      const { error } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;
      console.log('Custom field deleted successfully.');
    } catch (error) {
      console.error('Error in handleDeleteField:', error);
    }
  };

  const handleEditField = async (fieldId, updatedName) => {
    try {
      console.log(`Updating custom field ${fieldId} with new name: ${updatedName}`);
      const { error } = await supabase
        .from('custom_fields')
        .update({ name: updatedName })
        .eq('id', fieldId);

      if (error) throw error;
      console.log('Custom field updated successfully.');
      setEditingField(null);
    } catch (error) {
      console.error('Error in handleEditField:', error);
    }
  };

  const handleEditClick = (field) => {
    console.log('Editing field:', field);
    setEditingField(field.id);
  };

  const handleEditInputChange = (e, fieldId) => {
    const newValue = e.target.value;
    console.log(`Field ID ${fieldId} changed to:`, newValue);
    setCustomFields((prev) =>
      prev.map((field) =>
        field.id === fieldId ? { ...field, name: newValue } : field
      )
    );
  };

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
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => handleEditInputChange(e, field.id)}
                      className="border p-2"
                    />
                  ) : (
                    <p className="font-medium">{field.name}</p>
                  )}
                  <p className="text-sm text-gray-600">Type: {field.type}</p>
                  {field.type === 'select' && field.options && (
                    <p className="text-sm text-gray-600">
                      Options: {JSON.stringify(field.options)}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  {editingField === field.id ? (
                    <button
                      onClick={() => handleEditField(field.id, field.name)}
                      className="text-green-500 hover:underline"
                    >
                      Save
                    </button>
                  ) : (
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
            onChange={(e) => setNewField({ ...newField, name: e.target.value })}
            className="border p-2 w-full"
          />
          <select
            value={newField.type}
            onChange={(e) => setNewField({ ...newField, type: e.target.value })}
            className="border p-2 w-full"
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="select">Dropdown</option> {/* Changed to "select" */}
            <option value="multiselect">Multi-Select</option>
          </select>
          {newField.type === 'select' && (
            <input
              type="text"
              placeholder="Options (comma-separated, e.g., Option1, Option2)"
              value={newField.options}
              onChange={(e) => setNewField({ ...newField, options: e.target.value })}
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