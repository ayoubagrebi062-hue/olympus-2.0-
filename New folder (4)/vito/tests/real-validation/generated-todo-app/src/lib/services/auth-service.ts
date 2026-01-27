// src/lib/services/auth-service.ts
interface User {
  id: number;
  email: string;
  password: string;
  name: string;
}

const users: User[] = [
  { id: 1, email: 'admin@example.com', password: 'password123', name: 'Admin' },
  { id: 2, email: 'user@example.com', password: 'password123', name: 'User' },
];

let currentUser: User | null = null;

class AuthService {
  login(email: string, password: string): User | null {
    const user = users.find((user) => user.email === email && user.password === password);
    if (user) {
      currentUser = user;
      return user;
    }
    return null;
  }

  signup(email: string, password: string, name: string): User {
    const newUser: User = {
      id: users.length + 1,
      email,
      password,
      name,
    };
    users.push(newUser);
    currentUser = newUser;
    return newUser;
  }

  logout(): void {
    currentUser = null;
  }

  getCurrentUser(): User | null {
    return currentUser;
  }
}

const authService = new AuthService();

export default authService;