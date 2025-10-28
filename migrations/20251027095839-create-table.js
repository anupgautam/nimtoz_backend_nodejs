// migrations/20251027095839-create-table.js
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function up(db, callback) {
  try {
    // Path to the SQL file
    const sqlFilePath = join(__dirname, 'sqls', '20251027095839-create-table-up.sql');
    console.log(`Attempting to read SQL file from: ${sqlFilePath}`);
    
    // Read the SQL file
    const sql = await readFile(sqlFilePath, 'utf8');
    
    // Split SQL into statements, handling DELIMITER for triggers
    let statements = [];
    let currentStatement = '';
    let currentDelimiter = ';';
    const lines = sql.split('\n');
    
    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('--')) continue;
      
      if (line.match(/^DELIMITER\s+/i)) {
        if (currentStatement.trim()) {
          statements.push(currentStatement.trim());
        }
        currentDelimiter = line.replace(/^DELIMITER\s+/i, '').trim();
        currentStatement = '';
        continue;
      }
      
      currentStatement += line + '\n';
      if (line.includes(currentDelimiter) && !currentStatement.includes('CREATE TRIGGER')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    // Process statements to handle trigger blocks
    const finalStatements = [];
    for (let statement of statements) {
      if (statement.includes('CREATE TRIGGER')) {
        // Remove DELIMITER markers from trigger statement
        statement = statement.replace(/DELIMITER\s+\/\/\s*/i, '').replace(/DELIMITER\s+;\s*/i, '');
        finalStatements.push(statement.trim());
      } else {
        finalStatements.push(statement.trim());
      }
    }
    
    // Execute each statement individually
    for (let i = 0; i < finalStatements.length; i++) {
      const statement = finalStatements[i];
      console.log(`Executing statement ${i + 1}: ${statement.substring(0, 100)}...`);
      await db.runSql(statement);
    }
    
    callback();
  } catch (error) {
    console.error(`Error executing statement: ${error}`);
    callback(error);
  }
}

export async function down(db, callback) {
  try {
    // Drop all tables in reverse order to avoid foreign key constraints issues
    const tables = [
      'EventCateringTent', 'EventPartyPalace', 'EventAdventure', 'EventBeautyDecor',
      'EventMeeting', 'EventEntertainment', 'EventLuxury', 'EventMusical', 'EventMultimedia',
      'ContactUs', 'Blog', 'ProductRating', 'EventEventType', 'Event', 'CateringTent',
      'PartyPalace', 'Adventure', 'BeautyDecor', 'Meeting', 'Entertainment', 'Luxury',
      'Musical', 'Multimedia', 'ProductImage', 'Product', 'EventType', 'Venue',
      'District', 'Category', 'User', 'Role'
    ];

    for (const table of tables) {
      await db.runSql(`DROP TABLE IF EXISTS \`${table}\``);
    }
    callback();
  } catch (error) {
    callback(error);
  }
}