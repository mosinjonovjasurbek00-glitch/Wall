export function slugify(text: string): string {
  const charMap: { [key: string]: string } = {
    'sh': 'sh', 
    'ch': 'ch',
    'o\'': 'o',
    'g\'': 'g',
    'o’': 'o',
    'g’': 'g',
    'я': 'ya',
    'ё': 'yo',
    'ю': 'yu',
    'ц': 'ts',
    'щ': 'sh',
    'ы': 'y'
  };

  let result = text.toLowerCase();
  
  // Specific Uzbek/Cyrillic handlings if needed
  Object.keys(charMap).forEach(key => {
    result = result.split(key).join(charMap[key]);
  });

  return result
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
