// Playable characters. They are fictional composites based on common real-world situations.

export const CHARACTERS = {
  priya: {
    id: 'priya', name: 'Priya', age: 25, country: 'India', home: 'Bengaluru, India',
    flag: 'flag-india', bg: 'bg-bengaluru', color: '#f97316', track: 'h1b', chart: 'india',
    tagline: 'Software engineer · U.S. master’s graduate',
    intro: 'Priya grew up in Bengaluru, India. She just earned a master’s degree in computer science from a U.S. university, and a robotics company in Ohio hired her. Right now she is working on OPT, a student work permit that lasts up to 3 years.',
    goal: 'Win a work visa, then get a green card (permanent residency). Maybe even become a U.S. citizen.',
    startMoney: 2000,
    startHand: ['h1b-reg'],
    startFolder: ['passport', 'diploma'],
    rival: 'lukas',
  },
  lukas: {
    id: 'lukas', name: 'Lukas', age: 25, country: 'Germany', home: 'Munich, Germany',
    flag: 'flag-germany', bg: 'bg-munich', color: '#38bdf8', track: 'h1b', chart: 'row',
    tagline: 'Software engineer · U.S. master’s graduate',
    intro: 'Lukas grew up in Munich, Germany. He just earned a master’s degree in computer science from a U.S. university, and the same robotics company in Ohio hired him. Right now he is working on OPT, a student work permit that lasts up to 3 years.',
    goal: 'Win a work visa, then get a green card (permanent residency). Maybe even become a U.S. citizen.',
    startMoney: 2000,
    startHand: ['h1b-reg'],
    startFolder: ['passport', 'diploma'],
    rival: 'priya',
  },
  marco: {
    id: 'marco', name: 'Marco', age: 29, country: 'Mexico', home: 'Guanajuato, Mexico',
    flag: 'flag-mexico', bg: 'bg-mexico-farm', color: '#22c55e', track: 'h2a', chart: 'mexico-eb3',
    tagline: 'Farmworker · H-2A guest worker',
    intro: 'Marco lives in a small town in Guanajuato, Mexico, with his wife and two kids. Farm jobs at home pay very little. A farm in Georgia has hired him for the harvest season through the H-2A guest worker program, and it already filed the first paperwork for him.',
    goal: 'Work the harvest season each year and save $50,000 to build a house for your family. Look for any path to stay permanently.',
    startMoney: 800,
    startHand: [],
    startFolder: ['passport'],
    familyGoal: 50000,
    rival: 'priya',
  },
};

export const PAIRINGS = [
  { a: 'priya', b: 'lukas', title: 'Same job, different country', note: 'Identical degrees, identical job, identical forms. Watch what country of birth does.' },
  { a: 'marco', b: 'lukas', title: 'Two kinds of “worker visa”', note: 'A seasonal farm visa vs. a skilled-worker visa. Which one leads to a green card?' },
  { a: 'marco', b: 'priya', title: 'Two long roads', note: 'Both work hard in the U.S. Both face walls they can’t control.' },
];
