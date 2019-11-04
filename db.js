const faunadb = require('faunadb');
const _ = require('lodash');
const q = faunadb.query;

const db = new faunadb.Client({ secret: process.env.FAUNA_KEY});

function upsertManyQuery(collection, datas) {
  if (!_.isArray(datas)) {
    datas = [datas];
  }

  return q.Map(
    datas,
    q.Lambda(
      'data',
      q.Create(
        q.Collection(collection),
        { data: q.Var('data') },
      )
    ),
  );
}

module.exports.createChatMessages = async function (messages) {
  const query = upsertManyQuery('chat', messages);

  try {
    let fetchedData = await db.query(query);
  } catch (e) {
    return false;
  }

  return true;
};

module.exports.getAllChat = async function () {
  let fetchedData = await db.query(
    q.Map(
      q.Paginate(
        q.Match(q.Index('all_chat'))),
      q.Lambda('x', q.Get(q.Var('x')))));

  fetchedData = _.map(fetchedData.data, d => d.data);
  console.error(fetchedData);
};

module.exports.deleteChatMessage = async function (messageId) {
  let fetchedData = await db.query(
    q.Update(
      q.Select('ref', q.Get(q.Match('chat_by_id', messageId))),
      {
        data: {
          deleted: true,
        },
      },
    ));
};


module.exports.createOverlay = async function (data) {
  let fetchedData = await db.query(
    q.Create(q.Collection('overlay'), {
      data,
    }));
};
