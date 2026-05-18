import { useSpring } from '@react-spring/web';

function useSpringNumber(targetValue) {
  const { num } = useSpring({
    num: targetValue,
    config: { mass: 1, tension: 120, friction: 20 },
  });
  return { springValue: num };
}

export default useSpringNumber;
