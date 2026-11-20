// All schedules Ritmo knows. A new schedule is a module like rugplan.js, added here.
import rugplan from './rugplan.js';

export const programs = {
  [rugplan.id]: rugplan,
};

export const defaultProgramId = rugplan.id;

export function getProgram(id) {
  return programs[id] || programs[defaultProgramId];
}
