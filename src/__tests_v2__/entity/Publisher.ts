import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn
} from "typeorm";
import { Book } from "./Book";
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
@Entity()
export class Publisher extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column("varchar")
  name!: string;

  @Field()
  @Column("varchar")
  address!: string;

  @Field(type => Book)
  @OneToMany(
    type => Book,
    book => book.publisher
  )
  books!: Book[];
}
