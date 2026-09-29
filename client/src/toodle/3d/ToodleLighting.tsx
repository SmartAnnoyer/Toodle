export function ToodleLighting() {
  return (
    <>
      <hemisphereLight args={['#fff7fb', '#ddd6fe', 0.55]} />
      <ambientLight intensity={0.4} color="#f5e9ff" />
      <directionalLight position={[1.6, 2.8, 3.2]} intensity={1.35} color="#fff7fb" />
      <directionalLight position={[-2.2, 1.1, 1.4]} intensity={0.55} color="#67e8f9" />
      <directionalLight position={[0.2, 1.6, -2.2]} intensity={0.7} color="#ffffff" />
      <pointLight position={[0.4, 1.4, 1.8]} intensity={0.85} color="#f9a8d4" distance={6} />
    </>
  );
}
