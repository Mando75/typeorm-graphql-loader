import {
  CreateDateColumn,
  Column,
  ManyToOne,
  BaseEntity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
  Entity
} from "typeorm";
import { Author } from "./Author";
import { Publisher } from "./Publisher";
import { Review } from "./Review";
import { Field, Int, ObjectType } from "type-graphql";

@ObjectType()
@Entity()
export class Book extends BaseEntity {
  @Field(type => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column("varchar")
  title!: string;

  @Field()
  @Column("text")
  summary!: string;

  @Field(type => String)
  @Column("date")
  publishedDate!: Date;

  @Field(type => Author)
  @ManyToOne(
    type => Author,
    author => author.books
  )
  author!: Author;

  @Field(type => Publisher)
  @ManyToOne(
    type => Publisher,
    publisher => publisher.books
  )
  publisher!: Publisher;

  @Field(type => [Review])
  @OneToMany(
    t => Review,
    review => review.book
  )
  reviews!: Review[];

  @Field()
  @CreateDateColumn()
  createdAt!: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt!: Date;
}
