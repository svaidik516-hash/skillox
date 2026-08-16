const db = require('./database.js');
db.getUserByEmail('svaidik516@gmail.com')
  .then(user => {
      console.log('User found:', user ? user.name : 'no user');
      if (user && user.profile_picture) {
          console.log('Profile picture length:', user.profile_picture.length);
          console.log('Snippet:', user.profile_picture.substring(0, 100));
      } else {
          console.log('No profile picture');
      }
      process.exit(0);
  })
  .catch(err => { console.error(err); process.exit(1); });
