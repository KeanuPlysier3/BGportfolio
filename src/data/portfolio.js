/*
 * All portfolio content lives here. Every location on the island points at
 * one of these entries by id. Edit freely — the UI renders straight from this.
 */

export const PROFILE = {
  name: 'Keanu Plysier',
  title: 'Student Digital Design & Development',
  school: 'Howest Kortrijk',
  tagline: 'Final-year DEVINE student · Major Development · Minor UX',
  internship: { from: '15.02.2027', to: '21.05.2027' },
  about: [
    'Enthusiastic final-year Digital Design & Development student, majoring in Development with a minor in UX.',
    'I have been programming for about seven years, the last four mostly focused on web development — the part of the programme I care about most. I get top results there (19/20 on my latest Web Development exam) and combine technical knowledge with a strong feel for UX and visual design.',
    'I learn quickly through documentation and a responsible use of AI.',
  ],
  // skill dots from the CV (out of 5) — shown as BG3-style ability scores
  abilities: [
    { name: 'Teamwork', short: 'TMW', dots: 5 },
    { name: 'Flexibility', short: 'FLX', dots: 4 },
    { name: 'Efficiency', short: 'EFF', dots: 4 },
    { name: 'Discipline', short: 'DSC', dots: 5 },
    { name: 'Quick learner', short: 'LRN', dots: 5 },
  ],
  traits: ['Eager to learn', 'Precise', 'Driven', 'Flexible'],
  languages: [
    { name: 'Dutch', level: 'Native' },
    { name: 'English', level: 'Fluent' },
  ],
};

export const CONTACT = [
  { label: 'Email', value: 'keanu.plysier@gmail.com', href: 'mailto:keanu.plysier@gmail.com' },
  { label: 'Phone', value: '0493 88 56 22', href: 'tel:+32493885622' },
  { label: 'GitHub', value: 'github.com/KeanuPlysier3', href: 'https://github.com/KeanuPlysier3' },
  // TODO: add the exact profile URLs — the CV only lists the platforms.
  { label: 'Figma', value: 'App design', href: null },
  { label: 'Behance', value: 'UX projects', href: null },
];

export const PROJECTS = {
  planA: {
    name: 'Plan A',
    role: 'Lead Developer',
    client: 'City of Antwerp',
    summary:
      'Interactive group-trip planner for the City of Antwerp. I built the Node.js server that acts as a validation layer between the clients and the MySQL database, and was fully responsible for the development.',
    stack: ['Node.js', 'Express', 'MySQL', 'REST APIs', 'Nodemailer', 'MJML'],
    link: { label: 'keanupl.be/planA', href: 'https://keanupl.be/planA' },
  },
  momu: {
    name: 'MoMu — Dirk',
    role: 'Front-end Developer',
    client: 'MoMu · Fashion Museum Antwerp',
    summary:
      'Interactive web experience for the Fashion Museum Antwerp that visualises the story behind the collection of an Antwerp designer. Focus on advanced responsive design, micro-interactions and animation.',
    stack: ['Vite', 'GSAP', 'Responsive design', 'Micro-interactions'],
    link: { label: 'keanuplysier3.github.io/dirk', href: 'https://keanuplysier3.github.io/dirk' },
  },
  ml: {
    name: 'Web experiments with Machine Learning',
    role: 'Personal research',
    client: 'Self-initiated',
    summary:
      'A series of smaller browser projects with ML integrations, used to pick up new technology fast and combine it with interactive front-end development.',
    stack: ['TensorFlow', 'ML5.js', 'JavaScript'],
    link: { label: 'github.com/KeanuPlysier3', href: 'https://github.com/KeanuPlysier3' },
  },
};

export const ARSENAL = [
  { group: 'Weapons', subtitle: 'Front-end', items: ['JavaScript', 'TypeScript', 'React', 'React Native', 'HTML/CSS', 'Astro', 'GSAP'] },
  { group: 'Armour', subtitle: 'Back-end', items: ['Node.js', 'Express', 'PHP', 'MySQL', "REST API's"] },
  { group: 'Trinkets', subtitle: 'Tools & ML', items: ['Git', 'TensorFlow', 'ML5.js', 'Vite', 'Figma'] },
];

export const EDUCATION = [
  {
    period: '2024 – present',
    school: 'Howest Kortrijk',
    course: 'Digital Design & Development (DEVINE)',
    detail: 'Major Development · Minor UX',
  },
  {
    period: '2022 – 2024',
    school: 'Sint-Jozefscollege Torhout',
    course: 'Informatica Beheer (IT Management)',
    detail: '',
  },
];

export const EXPERIENCE = [
  {
    period: '2024',
    company: 'Lebon IT Services',
    role: 'Internship',
    detail: 'IT-focused internship where I worked independently and took ownership of the tasks entrusted to me.',
  },
];
