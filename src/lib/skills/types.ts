export interface SkillParameter {
  name: string;
  description: string;
}

export interface SkillOutputSection {
  title: string;
  items: string[];
}

export interface SkillScenario {
  id: string;
  label: string;
}

/** The shape the UI renders. `id` is the URL slug of the skill's lineage. */
export interface Skill {
  id: string;
  name: string;
  summary: string;
  description: string;
  usage: string;
  parameters: SkillParameter[];
  exampleOutput: SkillOutputSection;
  scenarios: SkillScenario[];
}
