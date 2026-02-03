<script setup lang="ts">
import { computed } from 'vue';

// Tag definitions (same as backend)
const TAG_CATEGORIES = {
  work: { id: 'work', name: 'Travail', icon: '💼', color: '#3b82f6' },
  social: { id: 'social', name: 'Social', icon: '👥', color: '#8b5cf6' },
  health: { id: 'health', name: 'Sante', icon: '❤️', color: '#ef4444' },
  personal: { id: 'personal', name: 'Perso', icon: '🎯', color: '#f59e0b' },
  external: { id: 'external', name: 'Externe', icon: '🌤️', color: '#06b6d4' },
};

const TAGS: Record<string, { id: string; category: string; name: string; positive: boolean; icon: string }> = {
  // Work - Positive
  productive: { id: 'productive', category: 'work', name: 'Productif', positive: true, icon: '✅' },
  useful_meeting: { id: 'useful_meeting', category: 'work', name: 'Reunion utile', positive: true, icon: '🤝' },
  project_progress: { id: 'project_progress', category: 'work', name: 'Projet avance', positive: true, icon: '📈' },
  recognition: { id: 'recognition', category: 'work', name: 'Reconnaissance', positive: true, icon: '🏆' },
  // Work - Negative
  overload: { id: 'overload', category: 'work', name: 'Surcharge', positive: false, icon: '😫' },
  useless_meeting: { id: 'useless_meeting', category: 'work', name: 'Reunion inutile', positive: false, icon: '🙄' },
  work_conflict: { id: 'work_conflict', category: 'work', name: 'Conflit travail', positive: false, icon: '⚡' },
  deadline: { id: 'deadline', category: 'work', name: 'Deadline', positive: false, icon: '⏰' },

  // Social - Positive
  good_exchanges: { id: 'good_exchanges', category: 'social', name: 'Bons echanges', positive: true, icon: '💬' },
  party: { id: 'party', category: 'social', name: 'Soiree', positive: true, icon: '🎉' },
  family_time: { id: 'family_time', category: 'social', name: 'Famille', positive: true, icon: '👨‍👩‍👧' },
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

const props = defineProps<{
  modelValue: string[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

type TagType = { id: string; category: string; name: string; positive: boolean; icon: string };
type GroupedTags = { positive: TagType[]; negative: TagType[] };

// Group tags by category
const tagsByCategory = computed((): Record<string, GroupedTags> => {
  const grouped: Record<string, GroupedTags> = {};

  for (const catId of Object.keys(TAG_CATEGORIES)) {
    grouped[catId] = { positive: [], negative: [] };
  }

  for (const tag of Object.values(TAGS)) {
    const group = grouped[tag.category];
    if (group) {
      if (tag.positive) {
        group.positive.push(tag);
      } else {
        group.negative.push(tag);
      }
    }
  }

  return grouped;
});

function isSelected(tagId: string): boolean {
  return props.modelValue.includes(tagId);
}

function toggleTag(tagId: string) {
  const newValue = [...props.modelValue];
  const index = newValue.indexOf(tagId);

  if (index === -1) {
    newValue.push(tagId);
  } else {
    newValue.splice(index, 1);
  }

  emit('update:modelValue', newValue);
}

function getCategoryColor(catId: string): string {
  return TAG_CATEGORIES[catId as keyof typeof TAG_CATEGORIES]?.color || '#888';
}
</script>

<template>
  <div class="tag-selector">
    <div class="tag-header">
      <span class="tag-title">🏷️ Facteurs de la journee</span>
      <span class="tag-count" v-if="modelValue.length">{{ modelValue.length }} selectionne(s)</span>
    </div>

    <div class="categories">
      <div
        v-for="(cat, catId) in TAG_CATEGORIES"
        :key="catId"
        class="category"
      >
        <div class="category-header" :style="{ '--cat-color': cat.color }">
          <span class="category-icon">{{ cat.icon }}</span>
          <span class="category-name">{{ cat.name }}</span>
        </div>

        <div class="tag-groups">
          <!-- Positive tags -->
          <div class="tag-group tag-group--positive" v-if="tagsByCategory[catId as string]?.positive?.length">
            <div class="tag-group-label">👍</div>
            <div class="tags">
              <button
                v-for="tag in tagsByCategory[catId as string]?.positive || []"
                :key="tag.id"
                type="button"
                class="tag tag--positive"
                :class="{ 'tag--selected': isSelected(tag.id) }"
                :style="{ '--tag-color': getCategoryColor(catId as string) }"
                @click="toggleTag(tag.id)"
              >
                <span class="tag-icon">{{ tag.icon }}</span>
                <span class="tag-name">{{ tag.name }}</span>
              </button>
            </div>
          </div>

          <!-- Negative tags -->
          <div class="tag-group tag-group--negative" v-if="tagsByCategory[catId as string]?.negative?.length">
            <div class="tag-group-label">👎</div>
            <div class="tags">
              <button
                v-for="tag in tagsByCategory[catId as string]?.negative || []"
                :key="tag.id"
                type="button"
                class="tag tag--negative"
                :class="{ 'tag--selected': isSelected(tag.id) }"
                @click="toggleTag(tag.id)"
              >
                <span class="tag-icon">{{ tag.icon }}</span>
                <span class="tag-name">{{ tag.name }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tag-selector {
  width: 100%;
  max-width: 500px;
}

.tag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.tag-title {
  font-size: 14px;
  font-weight: 700;
  opacity: 0.9;
}

.tag-count {
  font-size: 11px;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  opacity: 0.7;
}

.categories {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 10px;
  transition: border-color 0.2s;
}

.category:hover {
  border-color: rgba(255, 255, 255, 0.15);
}

.category-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.category-icon {
  font-size: 14px;
}

.category-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--cat-color, #fff);
  opacity: 0.9;
}

.tag-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tag-group {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.tag-group-label {
  font-size: 12px;
  width: 20px;
  flex-shrink: 0;
  padding-top: 4px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-size: 11px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.tag:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.tag--positive.tag--selected {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.5);
  color: #86efac;
}

.tag--negative.tag--selected {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
  color: #fca5a5;
}

.tag-icon {
  font-size: 12px;
}

.tag-name {
  font-weight: 500;
}

/* Mobile responsive */
@media (max-width: 600px) {
  .tag-selector {
    max-width: 100%;
  }

  .tag-header {
    margin-bottom: 10px;
  }

  .tag-title {
    font-size: 13px;
  }

  .categories {
    gap: 10px;
  }

  .category {
    padding: 10px;
    border-radius: 8px;
  }

  .category-header {
    margin-bottom: 6px;
    padding-bottom: 6px;
  }

  .category-name {
    font-size: 11px;
  }

  .tag-groups {
    gap: 6px;
  }

  .tag-group {
    gap: 6px;
  }

  .tag-group-label {
    font-size: 11px;
    width: 18px;
    padding-top: 5px;
  }

  .tags {
    gap: 5px;
  }

  .tag {
    padding: 6px 10px;
    font-size: 11px;
    border-radius: 14px;
    -webkit-tap-highlight-color: transparent;
  }

  .tag-icon {
    font-size: 12px;
  }
}

@media (max-width: 360px) {
  .tag {
    padding: 5px 8px;
    font-size: 10px;
  }

  .tag-icon {
    font-size: 11px;
  }

  .category {
    padding: 8px;
  }
}

/* Touch feedback */
@media (hover: none) and (pointer: coarse) {
  .tag:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .tag:active {
    transform: scale(0.95);
    opacity: 0.9;
  }

  .tag--positive.tag--selected:active,
  .tag--negative.tag--selected:active {
    transform: scale(0.95);
  }
}
</style>
