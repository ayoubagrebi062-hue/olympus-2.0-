'use client';

import React, { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface AddTaskFormProps {
  onAdd: (title: string) => void;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ onAdd }) => {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (title.trim() !== '') {
      onAdd(title);
      setTitle('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <Input
        label=""
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Enter task title"
      />
      <Button variant="primary" size="md" loading={false} disabled={false} onClick={() => {}}>
        Add
      </Button>
    </form>
  );
};

export default AddTaskForm;
