// Quick smoke test — 5 previously-failing schools
import { config as fullConfig } from "./scrape-coaches.config.js";

const testSchools = [
  "Auburn", "Illinois", "Penn State", "Baylor", "BYU", "Clemson", "Virginia Tech", "Nebraska"
];

const { schools, ...rest } = fullConfig;
export const config = {
  ...rest,
  schools: schools.filter(s => testSchools.includes(s.name)),
};
