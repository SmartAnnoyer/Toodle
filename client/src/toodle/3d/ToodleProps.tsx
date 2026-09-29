import type { ToodleProp } from '../animations';

function Gloss({ color, emissive = '#000000' }: { color: string; emissive?: string }) {
  return <meshStandardMaterial color={color} roughness={0.35} metalness={0.12} emissive={emissive} emissiveIntensity={0.15} />;
}

export function propAnchor(prop?: ToodleProp): 'face' | 'head' | 'hand' | 'back' | 'none' {
  if (!prop) return 'none';
  if (prop === 'glasses' || prop === 'sunglasses') return 'face';
  if (prop === 'helmet' || prop === 'party') return 'head';
  if (prop === 'backpack' || prop === 'blanket') return 'back';
  return 'hand';
}

export function ToodlePropMesh({ prop }: { prop: ToodleProp }) {
  if (prop === 'glasses' || prop === 'sunglasses') {
    const dark = prop === 'sunglasses';
    return (
      <group position={[0, 0.02, 0.3]}>
        <mesh position={[-0.1, 0, 0]}>
          <torusGeometry args={[0.055, 0.012, 8, 16]} />
          <meshStandardMaterial color={dark ? '#1e1b4b' : '#67e8f9'} roughness={0.2} metalness={0.4} />
        </mesh>
        <mesh position={[0.1, 0, 0]}>
          <torusGeometry args={[0.055, 0.012, 8, 16]} />
          <meshStandardMaterial color={dark ? '#1e1b4b' : '#67e8f9'} roughness={0.2} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.008, 0.008, 0.08, 8]} />
          <Gloss color={dark ? '#312e81' : '#a5f3fc'} />
        </mesh>
      </group>
    );
  }
  if (prop === 'helmet') {
    return (
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.4, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
        <Gloss color="#67e8f9" emissive="#22d3ee" />
      </mesh>
    );
  }
  if (prop === 'party') {
    return (
      <mesh position={[0, 0.42, 0]} rotation={[0.15, 0, 0.2]}>
        <coneGeometry args={[0.16, 0.32, 12]} />
        <Gloss color="#f472b6" emissive="#fb7185" />
      </mesh>
    );
  }
  if (prop === 'backpack') {
    return (
      <mesh position={[0, 0.05, -0.22]}>
        <boxGeometry args={[0.28, 0.32, 0.14]} />
        <Gloss color="#c084fc" />
      </mesh>
    );
  }
  if (prop === 'blanket') {
    return (
      <mesh position={[0, -0.05, 0.05]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.55, 0.08, 0.42]} />
        <meshStandardMaterial color="#a78bfa" roughness={0.8} />
      </mesh>
    );
  }
  if (prop === 'suitcase') {
    return (
      <group position={[0, -0.12, 0.08]}>
        <mesh>
          <boxGeometry args={[0.22, 0.16, 0.1]} />
          <Gloss color="#7c3aed" />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <torusGeometry args={[0.05, 0.012, 6, 12]} />
          <Gloss color="#fde68a" />
        </mesh>
      </group>
    );
  }
  if (prop === 'popcorn') {
    return (
      <group position={[0, -0.05, 0.06]}>
        <mesh>
          <coneGeometry args={[0.08, 0.14, 10]} />
          <Gloss color="#f472b6" />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <sphereGeometry args={[0.07, 10, 8]} />
          <Gloss color="#fef3c7" />
        </mesh>
      </group>
    );
  }
  if (prop === 'phone') {
    return (
      <mesh position={[0, -0.04, 0.05]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.08, 0.14, 0.015]} />
        <Gloss color="#1e1b4b" emissive="#22d3ee" />
      </mesh>
    );
  }
  if (prop === 'coffee') {
    return (
      <group position={[0, -0.02, 0.05]}>
        <mesh>
          <cylinderGeometry args={[0.045, 0.04, 0.08, 12]} />
          <Gloss color="#fde68a" />
        </mesh>
        <mesh position={[0.06, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.03, 0.008, 6, 10]} />
          <Gloss color="#f9a8d4" />
        </mesh>
      </group>
    );
  }
  if (prop === 'book' || prop === 'notebook') {
    return (
      <mesh position={[0, -0.02, 0.06]} rotation={[0.5, 0.2, 0]}>
        <boxGeometry args={[0.16, 0.02, 0.12]} />
        <Gloss color={prop === 'notebook' ? '#fbcfe8' : '#67e8f9'} />
      </mesh>
    );
  }
  if (prop === 'cake') {
    return (
      <mesh position={[0, -0.02, 0.05]}>
        <cylinderGeometry args={[0.08, 0.08, 0.06, 14]} />
        <Gloss color="#fb7185" emissive="#f472b6" />
      </mesh>
    );
  }
  if (prop === 'medicine') {
    return (
      <mesh position={[0, -0.02, 0.05]} rotation={[0, 0, 0.4]}>
        <capsuleGeometry args={[0.03, 0.06, 4, 8]} />
        <Gloss color="#86efac" />
      </mesh>
    );
  }
  if (prop === 'magnifyingGlass') {
    return (
      <group position={[0, -0.04, 0.06]} rotation={[0.4, 0, 0.2]}>
        <mesh>
          <torusGeometry args={[0.06, 0.01, 8, 16]} />
          <Gloss color="#fde68a" />
        </mesh>
        <mesh position={[0.08, -0.06, 0]} rotation={[0, 0, -0.6]}>
          <cylinderGeometry args={[0.01, 0.01, 0.1, 8]} />
          <Gloss color="#c4b5fd" />
        </mesh>
      </group>
    );
  }
  if (prop === 'heart' || prop === 'sparkles') {
    return (
      <mesh position={[0.12, 0.12, 0.1]}>
        <sphereGeometry args={[prop === 'heart' ? 0.06 : 0.04, 10, 8]} />
        <meshStandardMaterial color={prop === 'heart' ? '#fb7185' : '#fde68a'} emissive={prop === 'heart' ? '#fb7185' : '#fde68a'} emissiveIntensity={0.6} />
      </mesh>
    );
  }
  return (
    <mesh position={[0, 0.16, 0.12]}>
      <sphereGeometry args={[0.035, 8, 8]} />
      <meshStandardMaterial color="#fde68a" emissive="#fde68a" emissiveIntensity={0.5} />
    </mesh>
  );
}
