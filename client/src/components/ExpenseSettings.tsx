
import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Switch } from './ui/switch';

export function ExpenseSettings() {
  const [email, setEmail] = useState('');
  const [enabled, setEnabled] = useState(false);
  
  const saveConfig = async () => {
    await fetch('/api/expenses/forwarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, enabled })
    });
  };

  useEffect(() => {
    fetch('/api/expenses/forwarding')
      .then(res => res.json())
      .then(config => {
        setEmail(config.email);
        setEnabled(config.enabled);
      });
  }, []);

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Receipt Forwarding Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Forwarding Email</label>
          <Input 
            type="email" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="accounting@company.com"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <span>Enable Automatic Forwarding</span>
        </div>
        <Button onClick={saveConfig}>Save Settings</Button>
      </div>
    </Card>
  );
}
