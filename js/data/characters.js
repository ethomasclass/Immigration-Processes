// Playable characters: fictional composites based on common real situations.

export const CHARACTERS = {
  priya: {
    id: 'priya', name: 'Priya', she: 'She', age: 25, country: 'India', home: 'Bengaluru, India', flag: 'flag-india', photo: 'bg-bengaluru',
    color: 'var(--pink)', hex: '#ff5fa2', track: 'h1b', chart: 'india',
    role: 'Software engineer', path: 'Skilled worker visa (H-1B)',
    intro: 'Priya is from Bengaluru, India. She just finished a master\'s degree at a U.S. college, and a robot company in Ohio hired her. For now she works on a student permit that ends after 3 years.',
    goal: 'Climb the status ladder: student → work visa → in line → green card. Get as high as you can.',
    startMoney: 2000, startHand: ['lottery'], startFolder: ['passport', 'diploma', 'birth-cert'],
    family: 'Amma', familyRole: 'Mom',
    rival: 'lukas',
  },
  lukas: {
    id: 'lukas', name: 'Lukas', she: 'He', age: 25, country: 'Germany', home: 'Munich, Germany', flag: 'flag-germany', photo: 'bg-munich',
    color: 'var(--blue)', hex: '#2f6fd6', track: 'h1b', chart: 'row',
    role: 'Software engineer', path: 'Skilled worker visa (H-1B)',
    intro: 'Lukas is from Munich, Germany. He just finished a master\'s degree at a U.S. college, and the same robot company in Ohio hired him. For now he works on a student permit that ends after 3 years.',
    goal: 'Climb the status ladder: student → work visa → in line → green card. Get as high as you can.',
    startMoney: 2000, startHand: ['lottery'], startFolder: ['passport', 'diploma', 'birth-cert'],
    family: 'Lena', familyRole: 'Sister',
    rival: 'priya',
  },
  marco: {
    id: 'marco', name: 'Marco', she: 'He', age: 29, country: 'Mexico', home: 'Guanajuato, Mexico', flag: 'flag-mexico', photo: 'bg-mexico-farm',
    color: 'var(--green)', hex: '#1fa463', track: 'h2a', chart: 'mexico-eb3',
    role: 'Farmworker', path: 'Seasonal guest worker visa (H-2A)',
    intro: 'Marco lives in a small town in Guanajuato, Mexico, with his wife Rosa and two kids. Farm jobs at home pay very little. A farm in Georgia hired him for the harvest, and it already filed his first papers.',
    goal: 'Work the harvest each season and save $40,000 to build your family a house. Watch for any way up the status ladder.',
    startMoney: 800, startHand: [], startFolder: ['passport'], familyGoal: 40000,
    family: 'Rosa', familyRole: 'Wife',
    rival: 'lukas',
  },
};

export const PAIRINGS = [
  { a: 'priya', b: 'lukas', note: 'Same degree, same job, same forms. Watch what country of birth does.' },
  { a: 'marco', b: 'lukas', note: 'Two kinds of worker visa. Which one leads to a green card?' },
  { a: 'marco', b: 'priya', note: 'Both work hard in the U.S. Both hit walls they can\'t control.' },
];

// Texts from home. One shows at the start of each turn, picked by what just happened.
export const TEXTS = {
  priya: {
    start: ['So proud of you, kanna! Call me after your first day. ❤️'],
    'lottery-win': ['You won the lottery?! I\'m telling the whole family! 🎉'],
    'lottery-lose': ['Not picked? Don\'t lose heart. Try again next year.', 'Your cousin says maybe Canada is easier? Just saying…'],
    rejected: ['Rejected?? All that paperwork! What happened?'],
    visa: ['A real work visa! Now you can plan your life a little.'],
    line: ['You have a number in the line now? How long is the line?'],
    waiting: ['Your cousin got her green card in 2 years. Why is yours taking so long?', 'Appa asks if you can come home for Diwali. I told him it\'s complicated.', 'Still waiting? The line for India is so long. It\'s not fair.', 'We miss you. Send pictures of the snow!'],
    gc: ['GREEN CARD!!! I cried in the kitchen. Now you can visit any time! 😭'],
    default: ['Did you eat? Don\'t just eat cereal for dinner.', 'Your auntie asks when you\'re getting married 🙄'],
  },
  lukas: {
    start: ['Good luck with the new job! Don\'t forget Mama\'s birthday.'],
    'lottery-win': ['You won?! Nice. Drinks are on you at Christmas.'],
    'lottery-lose': ['Lost the lottery? Wow. Maybe just come home. Munich has jobs too.'],
    rejected: ['Rejected? Lukas, read the instructions 😂'],
    visa: ['Congrats on the visa! Mama made a cake with a tiny American flag.'],
    line: ['Mama asks what a "priority date" is. I said it\'s like a number at the bakery.'],
    waiting: ['How long do you wait for the green card part?', 'Oma wants to know when you\'re visiting.'],
    gc: ['Green card! Are you American now? (Not yet, I know. 5 more years.)'],
    default: ['Oma wants to know when you\'re visiting.', 'Sent you a photo of the dog. She misses you.'],
  },
  marco: {
    start: ['Sofi drew you a picture for your trip. Be safe, mi amor.'],
    season: ['The money arrived! We bought cement for the new room. 🏠', 'Sofi asks if you\'ll be home for her birthday.'],
    missed: ['It\'s ok. We\'ll get through this year together.', 'The bank called about the loan. We\'ll figure it out.'],
    rejected: ['What happened with the papers? Did someone make a mistake?'],
    visa: ['You got the visa! Call us before you cross.'],
    waiting: ['The dairy farm said it could take years? We\'ll wait. We always wait.'],
    gc: ['A green card?! Can we come too someday? 😭'],
    default: ['Mateo scored a goal today! ⚽', 'Your mom made tamales and saved you some.', 'It rained a lot this week. The roof is holding up.'],
  },
};
