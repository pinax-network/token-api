export function findMissingDatabases(availableDatabases: string[], expectedDatabases: string[]) {
    const available = new Set(availableDatabases);
    return expectedDatabases.filter((database) => !available.has(database));
}
