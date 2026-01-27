'use client';

import React from 'react';
import TaskItem from './TaskItem';

interface Task {
  id: number;
  title: string;
  completed: boolean;
}

interface Props {
  tasks: Task[];
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}

const TaskList: React.FC<Props> = ({ tasks, onToggle, onDelete }) => {
  if (tasks.length === 0) {
    return <div>No tasks available.</div>;
  }

  return (
    <ul>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={() => onToggle(task.id)}
          onDelete={() => onDelete(task.id)}
        />
      ))}
    </ul>
  );
};

export default TaskList;