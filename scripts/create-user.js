// Script to create an admin user (CJS version)
const { storage } = require('../server/storage');
const crypto = require('crypto');
const { UserRole } = require('../shared/schema');

async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, (err, buf) => {
      if (err) reject(err);
      resolve(`${buf.toString("hex")}.${salt}`);
    });
  });
}

async function createAdminUser() {
  try {
    const username = 'admin';
    const password = 'password123'; // Default password, should be changed after login
    
    // Check if user already exists
    const existingUser = await storage.getUserByUsername(username);
    
    if (existingUser) {
      console.log(`Updating user ${username} to manager role...`);
      
      // Update the user's role to manager
      const updatedUser = await storage.updateUser(existingUser.id, {
        role: UserRole.MANAGER
      });
      
      console.log('User updated successfully:', updatedUser);
      return;
    }
    
    // Create new admin user
    const hashedPassword = await hashPassword(password);
    
    const newUser = await storage.createUser({
      username,
      password: hashedPassword,
      role: UserRole.MANAGER,
      full_name: 'Admin User',
      email: 'admin@example.com'
    });
    
    console.log('Admin user created successfully:', newUser);
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
}

// Run the function
createAdminUser();