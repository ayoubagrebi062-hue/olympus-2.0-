class Task {
  id: string;
  title: string;
  completed: boolean;
  userId: string;

  constructor(id: string, title: string, completed: boolean, userId: string) {
    this.id = id;
    this.title = title;
    this.completed = completed;
    this.userId = userId;
  }
}

class TaskService {
  private tasks: Task[] = [];
  private idCounter: number = 0;

  getTasks(userId: string): Task[] {
    return this.tasks.filter(task => task.userId === userId);
  }

  getTask(id: string): Task | undefined {
    return this.tasks.find(task => task.id === id);
  }

  createTask(input: { title: string, userId: string }): Task {
    const newTask = new Task(
      (this.idCounter++).toString(),
      input.title,
      false,
      input.userId
    );
    this.tasks.push(newTask);
    return newTask;
  }

  updateTask(id: string, input: { title?: string, completed?: boolean }): Task | undefined {
    const task = this.getTask(id);
    if (task) {
      if (input.title) {
        task.title = input.title;
      }
      if (input.completed !== undefined) {
        task.completed = input.completed;
      }
    }
    return task;
  }

  deleteTask(id: string): void {
    this.tasks = this.tasks.filter(task => task.id !== id);
  }

  toggleTask(id: string): Task | undefined {
    const task = this.getTask(id);
    if (task) {
      task.completed = !task.completed;
    }
    return task;
  }
}

const taskService = new TaskService();
export default taskService;