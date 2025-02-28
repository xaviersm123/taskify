// MentionsInput.tsx
import React, { useState, useRef } from 'react';
import { User } from '../../lib/store/user';
import { formatUserDisplay } from '../../lib/utils/user-display';

interface MentionsInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange: (mentionedUsers: string[]) => void;
  placeholder?: string;
  users: User[];
}

export const MentionsInput: React.FC<MentionsInputProps> = ({
  value,
  onChange,
  onMentionsChange,
  placeholder,
  users,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [mentionSearch, setMentionSearch] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  // For suggestions, we simply use the full display name.
  // The lookup (userMap) is built from the full name in lowercase.
  const userMap = new Map(
    users.map(user => [formatUserDisplay(user).trim().toLowerCase(), user.id])
  );

  // For suggestion filtering, we use a simple regex that matches "@" followed by zero or more non-space characters.
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const pos = e.target.selectionStart || 0;
    setCursorPosition(pos);

    const beforeCursor = newValue.slice(0, pos);
    // This regex will match "@" followed by any characters (non-whitespace), even if it's incomplete.
    const mentionMatch = beforeCursor.match(/@([^\s@]*)$/);
    if (mentionMatch) {
      // Use the partial text (which might be empty) to filter suggestions.
      setMentionSearch(mentionMatch[1]);
      setShowSuggestions(true);
      setSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
    }
    onChange(newValue);
  };

  const insertMention = (user: User) => {
    const beforeCursor = value.slice(0, cursorPosition);
    const afterCursor = value.slice(cursorPosition);
    // Match the "@" and any characters until the cursor.
    const mentionMatch = beforeCursor.match(/@([^\s@]*)$/);
    if (mentionMatch) {
      // Insert the full display name (as provided by formatUserDisplay) followed by a space.
      const newValue =
        beforeCursor.slice(0, mentionMatch.index) +
        `@${formatUserDisplay(user)} ` +
        afterCursor;
      onChange(newValue);
      // Update mentioned users based on the full inserted text.
      const mentionedUsers = getMentionedUsers(newValue);
      console.log('Extracted mentionedUsers:', mentionedUsers);
      onMentionsChange(mentionedUsers);
    }
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSuggestionIndex(i => Math.min(i + 1, filteredUsers.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSuggestionIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredUsers[suggestionIndex]) {
          insertMention(filteredUsers[suggestionIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // For filtering suggestions, we use a simple case-insensitive match on the full display name.
  const filteredUsers = users.filter(user =>
    formatUserDisplay(user)
      .toLowerCase()
      .includes(mentionSearch.toLowerCase())
  );

  // Instead of using a regex to extract mentions (which can be tricky with spaces),
  // we iterate over each user and check if the comment text (lowercased) contains "@" followed by their full display name.
  const getMentionedUsers = (text: string): string[] => {
    const lowerText = text.toLowerCase();
    const ids: string[] = [];
    users.forEach(user => {
      const fullName = formatUserDisplay(user).trim().toLowerCase();
      // Check if the text includes "@" plus the full name.
      if (lowerText.includes(`@${fullName}`)) {
        ids.push(user.id);
      }
    });
    return Array.from(new Set(ids));
  };

  return (
    <div className="relative">
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
        rows={3}
      />
      {showSuggestions && filteredUsers.length > 0 && (
        <div className="absolute z-10 w-64 mt-1 bg-white rounded-md shadow-lg">
          <ul className="py-1 max-h-48 overflow-auto">
            {filteredUsers.map((user, index) => (
              <li
                key={user.id}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  index === suggestionIndex
                    ? 'bg-indigo-50 text-indigo-900'
                    : 'text-gray-900 hover:bg-gray-50'
                }`}
                onClick={() => insertMention(user)}
              >
                {formatUserDisplay(user)} ({user.id})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
