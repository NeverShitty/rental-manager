
import ReactFlow, { 
  Node, 
  Edge,
  Controls,
  Background,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';

const nodes: Node[] = [
  {
    id: 'prospect',
    position: { x: 0, y: 0 },
    data: { label: '🧲 Prospect\nForm Intake (HubSpot / Typeform)' },
    type: 'default',
  },
  {
    id: 'application',
    position: { x: 0, y: 100 },
    data: { label: '📋 Application\nScreening Trigger (SmartMove)' },
  },
  {
    id: 'lease',
    position: { x: 0, y: 200 },
    data: { label: '📝 Lease Generation\n(Replit API + Signeasy)' },
  },
  {
    id: 'deposit',
    position: { x: 0, y: 300 },
    data: { label: '💳 Deposit Hold\n(ChargeAutomation / Stripe)' },
  },
  {
    id: 'onboarding',
    position: { x: 0, y: 400 },
    data: { label: '📦 Onboarding Packet\n(WiFi, Lock, Contact Info)' },
  },
  {
    id: 'active',
    position: { x: 0, y: 500 },
    data: { label: '🏠 Active Tenant\nRent, Maintenance, Chat' },
  },
  {
    id: 'offboarding',
    position: { x: 0, y: 600 },
    data: { label: '👋 Offboarding\nMove-Out Form + Refund' },
  },
  {
    id: 'past',
    position: { x: 0, y: 700 },
    data: { label: '🌟 Past Guest\nReview Request + Referral' },
  },
];

const edges: Edge[] = [
  { id: 'e1-2', source: 'prospect', target: 'application' },
  { id: 'e2-3', source: 'application', target: 'lease' },
  { id: 'e3-4', source: 'lease', target: 'deposit' },
  { id: 'e4-5', source: 'deposit', target: 'onboarding' },
  { id: 'e5-6', source: 'onboarding', target: 'active' },
  { id: 'e6-7', source: 'active', target: 'offboarding' },
  { id: 'e7-8', source: 'offboarding', target: 'past' },
];

export default function TenantJourneyFlow() {
  return (
    <div style={{ width: '100%', height: '800px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
