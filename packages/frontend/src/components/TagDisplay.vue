<script setup lang="ts">
// Tag definitions (same as TagSelector)
const TAGS: Record<string, { id: string; category: string; name: string; positive: boolean; icon: string }> = {
  // Work
  productive: { id: 'productive', category: 'work', name: 'Productif', positive: true, icon: '✅' },
  useful_meeting: { id: 'useful_meeting', category: 'work', name: 'Reunion utile', positive: true, icon: '🤝' },
  project_progress: { id: 'project_progress', category: 'work', name: 'Projet avance', positive: true, icon: '📈' },
  recognition: { id: 'recognition', category: 'work', name: 'Reconnaissance', positive: true, icon: '🏆' },
  overload: { id: 'overload', category: 'work', name: 'Surcharge', positive: false, icon: '😫' },
  useless_meeting: { id: 'useless_meeting', category: 'work', name: 'Reunion inutile', positive: false, icon: '🙄' },
  work_conflict: { id: 'work_conflict', category: 'work', name: 'Conflit travail', positive: false, icon: '⚡' },
  deadline: { id: 'deadline', category: 'work', name: 'Deadline', positive: false, icon: '⏰' },
  // Social
  good_exchanges: { id: 'good_exchanges', category: 'social', name: 'Bons echanges', positive: true, icon: '💬' },
  party: { id: 'party', category: 'social', name: 'Soiree', positive: true, icon: '🎉' },
  family_time: { id: 'family_time', category: 'social', name: 'Famille', positive: true, icon: '👨‍👩‍👧' },
  new_contacts: { id: 'new_contacts', category: 'social', name: 'Nouveaux contacts', positive: true, icon: '🤗' },
  social_conflict: { id: 'social_conflict', category: 'social', name: 'Conflit', positive: false, icon: '😤' },
  loneliness: { id: 'loneliness', category: 'social', name: 'Solitude', positive: false, icon: '😔' },
  misunderstanding: { id: 'misunderstanding', category: 'social', name: 'Malentendu', positive: false, icon: '😕' },
  // Health
  sport: { id: 'sport', category: 'health', name: 'Sport', positive: true, icon: '🏃' },
  good_sleep: { id: 'good_sleep', category: 'health', name: 'Bien dormi', positive: true, icon: '😴' },
  energy: { id: 'energy', category: 'health', name: 'Energie', positive: true, icon: '⚡' },
  sick: { id: 'sick', category: 'health', name: 'Malade', positive: false, icon: '🤒' },
  tired: { id: 'tired', category: 'health', name: 'Fatigue', positive: false, icon: '😩' },
  bad_sleep: { id: 'bad_sleep', category: 'health', name: 'Mal dormi', positive: false, icon: '😵' },
  pain: { id: 'pain', category: 'health', name: 'Douleurs', positive: false, icon: '🤕' },
  // Personal
  hobby: { id: 'hobby', category: 'personal', name: 'Hobby', positive: true, icon: '🎨' },
  accomplishment: { id: 'accomplishment', category: 'personal', name: 'Accomplissement', positive: true, icon: '🎯' },
  relaxation: { id: 'relaxation', category: 'personal', name: 'Detente', positive: true, icon: '🧘' },
  good_news: { id: 'good_news', category: 'personal', name: 'Bonne nouvelle', positive: true, icon: '📰' },
  procrastination: { id: 'procrastination', category: 'personal', name: 'Procrastination', positive: false, icon: '📱' },
  anxiety: { id: 'anxiety', category: 'personal', name: 'Anxiete', positive: false, icon: '😰' },
  bad_news: { id: 'bad_news', category: 'personal', name: 'Mauvaise nouvelle', positive: false, icon: '😢' },
  // External
  good_weather: { id: 'good_weather', category: 'external', name: 'Beau temps', positive: true, icon: '☀️' },
  weekend: { id: 'weekend', category: 'external', name: 'Week-end', positive: true, icon: '🎊' },
  bad_weather: { id: 'bad_weather', category: 'external', name: 'Mauvais temps', positive: false, icon: '🌧️' },
  transport_issues: { id: 'transport_issues', category: 'external', name: 'Transports', positive: false, icon: '🚇' },
  unexpected: { id: 'unexpected', category: 'external', name: 'Imprevu', positive: false, icon: '😱' },
};

const props = defineProps<{
  tags: string[];
  compact?: boolean;
}>();

function getTag(id: string) {
  return TAGS[id] || { id, name: id, icon: '🏷️', positive: true };
}
</script>

<template>
  <div class="tag-display" :class="{ 'tag-display--compact': compact }">
    <span
      v-for="tagId in tags"
      :key="tagId"
      class="tag"
      :class="{
        'tag--positive': getTag(tagId).positive,
        'tag--negative': !getTag(tagId).positive
      }"
      :title="getTag(tagId).name"
    >
      <span class="tag-icon">{{ getTag(tagId).icon }}</span>
      <span v-if="!compact" class="tag-name">{{ getTag(tagId).name }}</span>
    </span>
  </div>
</template>

<style scoped>
.tag-display {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 11px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.tag--positive {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
  color: #86efac;
}

.tag--negative {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.tag-icon {
  font-size: 12px;
}

.tag-name {
  font-weight: 500;
}

/* Compact mode */
.tag-display--compact .tag {
  padding: 3px 6px;
  font-size: 10px;
}

.tag-display--compact .tag-icon {
  font-size: 11px;
}
</style>
