import { query } from "../db/client";

/**
 * Database management utilities for AI Tutor
 */

/**
 * List all topics and their content counts
 */
export async function listTopics() {
  try {
    const result = await query(`
      SELECT topic, COUNT(*) as count, 
             MIN(created_at) as first_added,
             MAX(created_at) as last_added
      FROM content_items 
      GROUP BY topic 
      ORDER BY topic
    `);

    console.log("\n📚 Topics in database:");
    console.log("─".repeat(80));

    if (result.rows.length === 0) {
      console.log("No topics found in database.");
      return;
    }

    result.rows.forEach((row) => {
      console.log(`📖 ${row.topic}`);
      console.log(`   Content items: ${row.count}`);
      console.log(
        `   Added: ${new Date(row.first_added).toLocaleDateString()}`
      );
      console.log("");
    });

    return result.rows;
  } catch (error) {
    console.error("Error listing topics:", error);
    throw error;
  }
}

/**
 * Remove all content for a specific topic
 */
export async function removeTopic(topicName: string) {
  try {
    console.log(`\n🗑️  Removing topic: "${topicName}"`);

    // First check if topic exists
    const checkResult = await query(
      "SELECT COUNT(*) as count FROM content_items WHERE topic = $1",
      [topicName]
    );

    const count = parseInt(checkResult.rows[0].count);

    if (count === 0) {
      console.log(`❌ Topic "${topicName}" not found in database.`);
      return false;
    }

    console.log(`Found ${count} content items to remove.`);

    // Remove from content_items
    await query("DELETE FROM content_items WHERE topic = $1", [topicName]);

    // Also remove related chat sessions and messages
    const chatSessionsResult = await query(
      "SELECT id FROM chat_sessions WHERE topic = $1",
      [topicName]
    );

    if (chatSessionsResult.rows.length > 0) {
      const sessionIds = chatSessionsResult.rows.map((row) => row.id);

      // Remove chat messages
      await query("DELETE FROM chat_messages WHERE session_id = ANY($1)", [
        sessionIds,
      ]);

      // Remove chat sessions
      await query("DELETE FROM chat_sessions WHERE topic = $1", [topicName]);

      console.log(
        `🗑️  Also removed ${chatSessionsResult.rows.length} chat sessions.`
      );
    }

    // Remove quiz sessions
    const quizResult = await query(
      "DELETE FROM quiz_sessions WHERE topic = $1",
      [topicName]
    );
    if (quizResult.rowCount && quizResult.rowCount > 0) {
      console.log(`🗑️  Also removed ${quizResult.rowCount} quiz sessions.`);
    }

    console.log(
      `✅ Successfully removed topic "${topicName}" and all related data.`
    );
    return true;
  } catch (error) {
    console.error("Error removing topic:", error);
    throw error;
  }
}

/**
 * Update/rename a topic
 */
export async function renameTopic(oldName: string, newName: string) {
  try {
    console.log(`\n✏️  Renaming topic from "${oldName}" to "${newName}"`);

    // Check if old topic exists
    const checkResult = await query(
      "SELECT COUNT(*) as count FROM content_items WHERE topic = $1",
      [oldName]
    );

    const count = parseInt(checkResult.rows[0].count);

    if (count === 0) {
      console.log(`❌ Topic "${oldName}" not found in database.`);
      return false;
    }

    // Check if new topic name already exists
    const existsResult = await query(
      "SELECT COUNT(*) as count FROM content_items WHERE topic = $1",
      [newName]
    );

    if (parseInt(existsResult.rows[0].count) > 0) {
      console.log(
        `❌ Topic "${newName}" already exists. Choose a different name.`
      );
      return false;
    }

    // Update content_items
    await query("UPDATE content_items SET topic = $1 WHERE topic = $2", [
      newName,
      oldName,
    ]);

    // Update chat_sessions
    await query("UPDATE chat_sessions SET topic = $1 WHERE topic = $2", [
      newName,
      oldName,
    ]);

    // Update quiz_sessions
    await query("UPDATE quiz_sessions SET topic = $1 WHERE topic = $2", [
      newName,
      oldName,
    ]);

    console.log(
      `✅ Successfully renamed topic from "${oldName}" to "${newName}"`
    );
    console.log(`📊 Updated ${count} content items.`);

    return true;
  } catch (error) {
    console.error("Error renaming topic:", error);
    throw error;
  }
}

/**
 * Clear all data from database
 */
export async function clearAllData() {
  try {
    console.log("\n⚠️  WARNING: This will remove ALL data from the database!");

    // Remove all data
    await query("DELETE FROM chat_messages");
    await query("DELETE FROM chat_sessions");
    await query("DELETE FROM quiz_sessions");
    await query("DELETE FROM content_items");

    console.log("✅ All data cleared from database.");
  } catch (error) {
    console.error("Error clearing database:", error);
    throw error;
  }
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case "list":
        await listTopics();
        break;

      case "remove":
        if (!args[1]) {
          console.log('Usage: npm run db-manage remove "topic-name"');
          process.exit(1);
        }
        await removeTopic(args[1]);
        break;

      case "rename":
        if (!args[1] || !args[2]) {
          console.log('Usage: npm run db-manage rename "old-name" "new-name"');
          process.exit(1);
        }
        await renameTopic(args[1], args[2]);
        break;

      case "clear":
        await clearAllData();
        break;

      default:
        console.log("\n📋 Database Management Commands:");
        console.log(
          "  npm run db-manage list                    - List all topics"
        );
        console.log(
          '  npm run db-manage remove "topic-name"     - Remove a topic'
        );
        console.log(
          '  npm run db-manage rename "old" "new"      - Rename a topic'
        );
        console.log(
          "  npm run db-manage clear                   - Clear all data"
        );
        console.log("");
        process.exit(1);
    }
  } catch (error) {
    console.error("Command failed:", error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}
