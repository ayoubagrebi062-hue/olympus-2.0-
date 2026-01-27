'use client';

import { useState } from 'react';
import TaskList from '../../components/tasks/TaskList';
import AddTaskForm from '../../components/tasks/AddTaskForm';
import { useRouter } from 'next/navigation';

interface Task {
  id: number;
  title: string;
  completed: boolean;
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: 'Learn Next.js', completed: false },
    { id: 2, title: 'Build a todo app', completed: true },
  ]);

  function handleAddTask(title: string) {
    const newTask: Task = {
      id: Date.now(),
      title,
      completed: false,
    };
    setTasks([...tasks, newTask]);
  }

  function handleToggleTask(id: number) {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  }

  function handleDeleteTask(id: number) {
    setTasks(tasks.filter(task => task.id !== id));
  }

  function handleLogout() {
    router.push('/');
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Tasks</h1>
        <button
          onClick={handleLogout}
          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
        >
          Logout
        </button>
      </div>
      <AddTaskForm onAdd={handleAddTask} />
      <TaskList tasks={tasks} onToggle={handleToggleTask} onDelete={handleDeleteTask} />
    </div>
  );
}
