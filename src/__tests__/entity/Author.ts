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
import { Field, Int, ObjectType } from "type-graphql";
import { Address } from "./Address";

@ObjectType()
@Entity()
export class Author extends BaseEntity {
  @Field(type => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field(type => Address)
  @Column(type => Address)
  address!: Address;

  @Field()
  @Column("varchar")
  email!: string;

  @Field()
  @Column("varchar")
  firstName!: string;

  @Field()
  @Column("varchar")
  lastName!: string;

  @Field()
  @Column({ name: "mobilePhone" })
  phone!: string;

  @Field(type => [Book])
  @OneToMany(type => Book, book => book.author)
  books!: Book[];

  @Field()
  @CreateDateColumn()
  createdAt!: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt!: Date;
}
