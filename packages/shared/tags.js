/**
 * Tag definitions for day factors
 * Shared between frontend and backend
 */

export const TAG_CATEGORIES = {
  work: {
    id: 'work',
    name: 'Travail',
    icon: '💼',
    color: '#3b82f6',
  },
  social: {
    id: 'social',
    name: 'Social',
    icon: '👥',
    color: '#8b5cf6',
  },
  health: {
    id: 'health',
    name: 'Sante',
    icon: '❤️',
    color: '#ef4444',
  },
  personal: {
    id: 'personal',
    name: 'Perso',
    icon: '🎯',
    color: '#f59e0b',
  },
  external: {
    id: 'external',
    name: 'Externe',
    icon: '🌤️',
    color: '#06b6d4',
  },
};

export const TAGS = {
  // Work - Positive
  productive: { id: 'productive', category: 'work', name: 'Productif', positive: true, icon: '✅' },
  useful_meeting: { id: 'useful_meeting', category: 'work', name: 'Reunion utile', positive: true, icon: '🤝' },
  project_progress: { id: 'project_progress', category: 'work', name: 'Projet avance', positive: true, icon: '📈' },
  recognition: { id: 'recognition', category: 'work', name: 'Reconnaissance', positive: true, icon: '🏆' },
  // Work - Negative
  overload: { id: 'overload', category: 'work', name: 'Surcharge', positive: false, icon: '😫' },
  useless_meeting: { id: 'useless_meeting', category: 'work', name: 'Reunion inutile', positive: false, icon: '🙄' },
  work_conflict: { id: 'work_conflict', category: 'work', name: 'Conflit travail', positive: false, icon: '⚡' },
  deadline: { id: 'deadline', category: 'work', name: 'Deadline stressante', positive: false, icon: '⏰' },

  // Social - Positive
  good_exchanges: { id: 'good_exchanges', category: 'social', name: 'Bons echanges', positive: true, icon: '💬' },
  party: { id: 'party', category: 'social', name: 'Soiree', positive: true, icon: '🎉' },
  family_time: { id: 'family_time', category: 'social', name: 'Moment famille', positive: true, icon: '👨‍👩‍👧' },
  new_contacts: { id: 'new_contacts', category: 'social', name: 'Nouveaux contacts', positive: true, icon: '🤗' },
  // Social - Negative
  social_conflict: { id: 'social_conflict', category: 'social', name: 'Conflit', positive: false, icon: '😤' },
  loneliness: { id: 'loneliness', category: 'social', name: 'Solitude', positive: false, icon: '😔' },
  misunderstanding: { id: 'misunderstanding', category: 'social', name: 'Malentendu', positive: false, icon: '😕' },

  // Health - Positive
  sport: { id: 'sport', category: 'health', name: 'Sport', positive: true, icon: '🏃' },
  good_sleep: { id: 'good_sleep', category: 'health', name: 'Bien dormi', positive: true, icon: '😴' },
  energy: { id: 'energy', category: 'health', name: 'Energie', positive: true, icon: '⚡' },
  // Health - Negative
  sick: { id: 'sick', category: 'health', name: 'Malade', positive: false, icon: '🤒' },
  tired: { id: 'tired', category: 'health', name: 'Fatigue', positive: false, icon: '😩' },
  bad_sleep: { id: 'bad_sleep', category: 'health', name: 'Mal dormi', positive: false, icon: '😵' },
  pain: { id: 'pain', category: 'health', name: 'Douleurs', positive: false, icon: '🤕' },

  // Personal - Positive
  hobby: { id: 'hobby', category: 'personal', name: 'Hobby', positive: true, icon: '🎨' },
  accomplishment: { id: 'accomplishment', category: 'personal', name: 'Accomplissement', positive: true, icon: '🎯' },
  relaxation: { id: 'relaxation', category: 'personal', name: 'Detente', positive: true, icon: '🧘' },
  good_news: { id: 'good_news', category: 'personal', name: 'Bonne nouvelle', positive: true, icon: '📰' },
  // Personal - Negative
  procrastination: { id: 'procrastination', category: 'personal', name: 'Procrastination', positive: false, icon: '📱' },
  anxiety: { id: 'anxiety', category: 'personal', name: 'Anxiete', positive: false, icon: '😰' },
  bad_news: { id: 'bad_news', category: 'personal', name: 'Mauvaise nouvelle', positive: false, icon: '😢' },

  // External - Positive
  good_weather: { id: 'good_weather', category: 'external', name: 'Beau temps', positive: true, icon: '☀️' },
  weekend: { id: 'weekend', category: 'external', name: 'Week-end', positive: true, icon: '🎊' },
  // External - Negative
  bad_weather: { id: 'bad_weather', category: 'external', name: 'Mauvais temps', positive: false, icon: '🌧️' },
  transport_issues: { id: 'transport_issues', category: 'external', name: 'Transports', positive: false, icon: '🚇' },
  unexpected: { id: 'unexpected', category: 'external', name: 'Imprevu', positive: false, icon: '😱' },
};

/**
 * Get tags grouped by category
 */
export function getTagsByCategory() {
  const grouped = {};
  for (const [catId, cat] of Object.entries(TAG_CATEGORIES)) {
    grouped[catId] = {
      ...cat,
      positive: [],
      negative: [],
    };
  }

  for (const tag of Object.values(TAGS)) {
    if (grouped[tag.category]) {
      if (tag.positive) {
        grouped[tag.category].positive.push(tag);
      } else {
        grouped[tag.category].negative.push(tag);
      }
    }
  }

  return grouped;
}

/**
 * Get tag by ID
 */
export function getTagById(id) {
  return TAGS[id] || null;
}

/**
 * Validate tag IDs
 */
export function validateTagIds(tagIds) {
  if (!Array.isArray(tagIds)) return [];
  return tagIds.filter(id => TAGS[id]);
}
