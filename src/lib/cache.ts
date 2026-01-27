class Cache {
  private store: { [key: string]: any } = {};

  get(key: string): any {
    return this.store[key];
  }

  set(key: string, value: any): void {
    this.store[key] = value;
  }

  invalidate(key: string): void {
    delete this.store[key];
  }
}

export const cache = new Cache();
