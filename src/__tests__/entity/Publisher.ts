import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn
} from "typeorm";
import { Book } from "./Book";
import { Field, Int, ObjectType } from "type-graphql";
import { Address } from "./Address";

@ObjectType()
@Entity()
export class Publisher extends BaseEntity {
  @Field(type => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column("varchar")
  name!: string;

  @Field(type => Address)
  @Column(type => Address)
  address!: Address;

  @Field(type => Address)
  @Column(type => Address)
  poBox!: Address;

  @Field(type => [Book], { nullable: true })
  @OneToMany(type => Book, book => book.publisher)
  books!: Book[];
}
