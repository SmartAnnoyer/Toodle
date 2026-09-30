function BladeMetal() {
  return <meshStandardMaterial color="#b7bcc6" metalness={0.74} roughness={0.22} />;
}

function Wrap() {
  return <meshStandardMaterial color="#6a1c22" roughness={0.48} />;
}

function GuardGold() {
  return <meshStandardMaterial color="#a68445" metalness={0.58} roughness={0.34} />;
}

export function SwordBlade() {
  return (
    <group position={[0, 0.15, 0]}>
      <mesh>
        <boxGeometry args={[0.014, 0.22, 0.004]} />
        <BladeMetal />
      </mesh>
      <mesh position={[0.006, 0, 0]}>
        <boxGeometry args={[0.003, 0.2, 0.003]} />
        <meshStandardMaterial color="#8a1e22" emissive="#5c1216" emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

export function SwordHandle() {
  return (
    <group position={[0, -0.02, 0]}>
      <mesh>
        <cylinderGeometry args={[0.011, 0.012, 0.07, 8]} />
        <meshStandardMaterial color="#141414" roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.012, 0]}>
        <torusGeometry args={[0.012, 0.0025, 5, 8]} />
        <Wrap />
      </mesh>
      <mesh position={[0, -0.012, 0]}>
        <torusGeometry args={[0.012, 0.0025, 5, 8]} />
        <Wrap />
      </mesh>
    </group>
  );
}

export function SwordGuard() {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <torusGeometry args={[0.02, 0.0035, 6, 12]} />
      <GuardGold />
    </mesh>
  );
}

export function SwordSheath() {
  return (
    <group>
      <mesh position={[0, -0.08, 0]}>
        <capsuleGeometry args={[0.014, 0.18, 4, 8]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.32} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[0.042, 0.01, 0.014]} />
        <GuardGold />
      </mesh>
    </group>
  );
}

export function ToodleSword({ drawn = true }: { drawn?: boolean }) {
  if (!drawn) {
    return (
      <group>
        <SwordSheath />
        <group position={[0, 0.06, 0]}>
          <SwordHandle />
        </group>
      </group>
    );
  }
  return (
    <group>
      <SwordHandle />
      <SwordGuard />
      <SwordBlade />
    </group>
  );
}
