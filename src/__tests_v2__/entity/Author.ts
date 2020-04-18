import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import { Book } from "./Book";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
@Entity()
export class Author extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column("varchar")
  email!: string;

  @Field()
  @Column("varchar")
  firstName!: string;

  @Field()
  @Column("varchar")
  lastName!: string;

  @Field(type => [Book])
  @OneToMany(
    type => Book,
    book => book.author
  )
  books!: Book[];

  @Field()
  @CreateDateColumn()
  createdAt!: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt!: Date;
}
