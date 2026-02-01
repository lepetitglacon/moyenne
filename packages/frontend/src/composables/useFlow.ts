import { ref, computed } from "vue";

const dayScore = ref<number>(0);
const dayComment = ref<string>(""); // <-- STRING, sinon [object Object]

const receivedComment = ref<string>(
  "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Nam eu neque ac erat posuere fringilla."
);
const otherScore = ref<number>(0);

export function useFlow() {
  const dayLabel = computed(() => `${dayScore.value} / 20`);
  const otherLabel = computed(() => `${otherScore.value} / 20`);

  return {
    dayScore,
    dayComment,
    dayLabel,
    receivedComment,
    otherScore,
    otherLabel,
  };
}
