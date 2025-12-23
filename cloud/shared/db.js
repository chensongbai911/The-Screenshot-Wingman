const cloud = require('wx-server-sdk');

class DBClient {
  constructor() {
    this.db = cloud.database();
  }

  async getUser (openid) {
    const res = await this.db.collection('users').doc(openid).get().catch(() => null);
    return res && res.data;
  }

  async upsertUser (openid, data) {
    return this.db.collection('users').doc(openid).set({
      _id: openid,
      ...data,
      updatedAt: new Date(),
    });
  }

  async updateUser (openid, data) {
    return this.db.collection('users').doc(openid).update({
      ...data,
      updatedAt: new Date(),
    });
  }

  async recordLedger (entry) {
    return this.db.collection('wallet_ledger').add({
      ...entry,
      createdAt: new Date(),
    });
  }

  async createTask (taskData) {
    const res = await this.db.collection('analysis_tasks').add({
      ...taskData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return res._id;
  }
}

module.exports = new DBClient();
