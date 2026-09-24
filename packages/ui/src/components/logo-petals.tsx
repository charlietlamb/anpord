const PETAL = "M-9-44H9L19-34L9-28L13-23L8-18H-8L-13-23L-9-28L-19-34Z";
const ANGLES = [0, 60, 120, 180, 240, 300];

export function LogoPetals() {
  return ANGLES.map((angle) => (
    <path d={PETAL} key={angle} transform={`rotate(${angle})`} />
  ));
}
