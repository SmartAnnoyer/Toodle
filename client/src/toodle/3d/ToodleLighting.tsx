export function ToodleLighting() {
  return (
    <>
      <ambientLight intensity={0.72} />
      <directionalLight position={[2.4, 3.2, 2.8]} intensity={1.25} color="#fff7ed" />
      <directionalLight position={[-2.6, 1.4, -1.2]} intensity={0.55} color="#67e8f9" />
      <pointLight position={[0, 1.2, 1.4]} intensity={0.45} color="#f9a8d4" />
    </>
  );
}
