
// Create property 
router.post('/', async (req, res) => {
  if (!req.isAuthenticated() || req.user?.role !== 'manager') {
    return res.sendStatus(403);
  }
  try {
    const property = await storage.createProperty(req.body);
    res.status(201).json(property);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update property
router.put('/:id', async (req, res) => {
  if (!req.isAuthenticated() || req.user?.role !== 'manager') {
    return res.sendStatus(403);
  }
  try {
    const property = await storage.updateProperty(parseInt(req.params.id), req.body);
    res.json(property);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete property
router.delete('/:id', async (req, res) => {
  if (!req.isAuthenticated() || req.user?.role !== 'manager') {
    return res.sendStatus(403);
  }
  try {
    await storage.deleteProperty(parseInt(req.params.id));
    res.sendStatus(204);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id/forecast', async (req, res) => {
  try {
    const propertyId = parseInt(req.params.id);
    const transactions = await storage.getTransactionsByPropertyId(propertyId);
    const forecast = await generatePropertyForecast(transactions, propertyId);
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});
