export function ToodleLighting() {
  return (
    <>
      <ambientLight intensity={0.55} color="#f5e9ff" />
      <directionalLight position={[1.6, 2.8, 3.2]} intensity={1.7} color="#fff7fb" />
      <directionalLight position={[-2.4, 0.6, -1]} intensity={0.85} color="#67e8f9" />
      <pointLight position={[0.4, 1.4, 1.8]} intensity={1.1} color="#f9a8d4" distance={6} />
      <pointLight position={[-0.8, -0.2, 1.2]} intensity={0.45} color="#818cf8" distance={4} />
    </>
  );
}
