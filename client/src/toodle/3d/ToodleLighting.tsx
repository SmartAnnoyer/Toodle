import { useTheme } from '../../theme/ThemeProvider';

export function ToodleLighting() {
  const og = useTheme().theme === 'og';
  if (og) {
    return (
      <>
        <hemisphereLight args={['#4a3028', '#140a0c', 0.42]} />
        <ambientLight intensity={0.32} color="#1c1412" />
        <directionalLight position={[1.2, 2.6, 3.1]} intensity={1.2} color="#fff6ee" />
        <directionalLight position={[-1.8, 1.4, -1.1]} intensity={0.9} color="#E32626" />
        <directionalLight position={[1.4, 0.8, 1.8]} intensity={0.42} color="#F0C878" />
      </>
    );
  }
  return (
    <>
      <hemisphereLight args={['#fff8f3', '#e4dceb', 0.5]} />
      <ambientLight intensity={0.42} color="#fff7fb" />
      <directionalLight position={[1.5, 2.7, 3.2]} intensity={1.22} color="#fffaf6" />
      <directionalLight position={[-2, 1.3, -0.6]} intensity={0.38} color="#B31313" />
      <directionalLight position={[0.6, 1.2, 2.1]} intensity={0.28} color="#F0C878" />
    </>
  );
}
