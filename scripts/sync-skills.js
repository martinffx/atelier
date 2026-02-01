#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const skillsDir = 'skills';
const pluginsDir = 'plugins';

const skillMapping = {
  'atelier-spec': [
    'atelier-spec-architect',
    'atelier-spec-beads',
    'atelier-spec-methodology',
    'atelier-spec-product',
    'atelier-spec-project-structure',
    'atelier-spec-testing'
  ],
  'atelier-oracle': [
    'atelier-oracle-challenge',
    'atelier-oracle-thinkdeep'
  ],
  'atelier-python': [
    'atelier-python-architecture',
    'atelier-python-build-tools',
    'atelier-python-fastapi',
    'atelier-python-modern-python',
    'atelier-python-monorepo',
    'atelier-python-sqlalchemy',
    'atelier-python-temporal',
    'atelier-python-testing'
  ],
  'atelier-typescript': [
    'atelier-typescript-api-design',
    'atelier-typescript-build-tools',
    'atelier-typescript-drizzle-orm',
    'atelier-typescript-dynamodb-toolbox',
    'atelier-typescript-effect-ts',
    'atelier-typescript-fastify',
    'atelier-typescript-functional-patterns',
    'atelier-typescript-testing'
  ]
};

function syncSkills() {
  console.log('Syncing skills to plugin directories...\n');
  
  let totalCopied = 0;
  
  for (const [plugin, skills] of Object.entries(skillMapping)) {
    const pluginSkillsDir = path.join(pluginsDir, plugin, 'skills');
    
    // Clean and recreate plugin skills directory
    if (fs.existsSync(pluginSkillsDir)) {
      fs.rmSync(pluginSkillsDir, { recursive: true });
    }
    fs.mkdirSync(pluginSkillsDir, { recursive: true });
    
    console.log(`${plugin}:`);
    
    // Copy each skill
    for (const skill of skills) {
      const sourceDir = path.join(skillsDir, skill);
      const targetDir = path.join(pluginSkillsDir, skill);
      
      if (fs.existsSync(sourceDir)) {
        fs.cpSync(sourceDir, targetDir, { recursive: true });
        console.log(`  ✓ ${skill}`);
        totalCopied++;
      } else {
        console.warn(`  ✗ Warning: ${skill} not found in ${skillsDir}/`);
      }
    }
    
    console.log('');
  }
  
  console.log(`Successfully synced ${totalCopied} skills across ${Object.keys(skillMapping).length} plugins.`);
}

syncSkills();
