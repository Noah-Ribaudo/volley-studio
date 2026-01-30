export const SILLY_TEAM_NAMES = [
  'Sets on the Beach',
  'Blockbusters Anonymous',
  'Spike Tyson',
  'Notorious D.I.G.',
  'Net Gain',
  "Bumpin' Uglies",
  'Setting Ducks',
  'Block Party Crashers',
  'Ace Ventura: Spike Detective',
  'The Spiked Punch',
  'Net Results',
  'Pass the Dutchie',
  'Sets Appeal',
  'Volley of the Dolls',
  'Attack of the Killer Serves',
  'No Blocking Zone',
  'Ball Busters',
  'Blockwork Orange',
  'Setflix and Chill',
  'One Hit Wonders',
  "Spike It Like It's Hot",
  'Passes Are for Quitters',
  'The Empire Strikes Block',
  'Serve-ivors',
  'Notorious B.L.O.C.K.',
  'The Ball Handlers',
  "We've Got the Nerve to Serve",
  'Bump, Set, Psych!',
  'The Rotation Nation',
  'Kiss My Ace',
  'Spikes, Camera, Action!',
  'Ctrl-Alt-Delete the Net',
  'The Pancake Flippers',
  'Net Flix and Kill',
  'Block and Roll',
  'Sets in the City',
  'Spiking Vikings',
  'Hits Happen',
  'Court Jesters',
  'Ball So Hard',
  'The Serving Suggestion',
  'Overpass Masters',
  'Setters of Catan',
  'The Dig Lebowskis',
  'Ace of Base-line',
  'The Block-ness Monster',
  'Libero My Hero',
  'Net-flix Originals',
  'Back Row Mafia',
  'The Roof Raisers',
] as const

export const getRandomTeamName = (): string => {
  const index = Math.floor(Math.random() * SILLY_TEAM_NAMES.length)
  return SILLY_TEAM_NAMES[index]
}










