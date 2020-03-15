import { Chance } from "chance";
import { Connection } from "typeorm";
import { Post } from "../entity/Post";
import { User } from "../entity/User";
import { ErrorLog } from "../entity/ErrorLog";

export async function seedDatabase(connection: Connection) {
  let UserRepo = connection.getRepository(User);
  let PostRepo = connection.getRepository(Post);
  let ErrorLogRepo = connection.getRepository(ErrorLog);

  const chance = new Chance();

  let users: Array<Partial<User>> = [];
  let posts: Array<Partial<Post>> = [];
  let errorLogs: Array<Partial<ErrorLog>> = [];
  let Users: User[] = [];

  if ((await UserRepo.count()) === 0) {
    await connection.transaction(async entityManager => {
      for (let i = 0; i < 25; i++) {
        const user = {
          email: chance.email(),
          firstName: chance.first(),
          lastName: chance.last(),
          age: chance.age()
        };
        users.push(user);
      }
      await entityManager
        .createQueryBuilder()
        .insert()
        .into(User)
        .values(users)
        .execute();
      Users = await entityManager.getRepository(User).find();
    });
  }

  if ((await PostRepo.count()) === 0) {
    await connection.transaction(async entityManager => {
      for (let i = 0; i < 100; i++) {
        const post: Partial<Post> = {
          title: chance.sentence(),
          content: chance.paragraph({
            sentences: chance.integer({ min: 1, max: 4 })
          }),
          camelizedField: chance.sentence(),
          owner: chance.pickone(Users)
        };
        posts.push(post);
      }
      await entityManager
        .createQueryBuilder()
        .insert()
        .into(Post)
        .values(posts)
        .execute();
    });
  }

  if ((await ErrorLogRepo.count()) === 0) {
    await connection.transaction(async entityManager => {
      for (let i = 0; i < 50; i++) {
        const log = {
          message: chance.sentence(),
          code: chance.word(),
          user: chance.pickone(Users)
        };
        errorLogs.push(log);
      }
      await entityManager
        .createQueryBuilder()
        .insert()
        .into(ErrorLog)
        .values(errorLogs)
        .execute();
    });
  }
}
