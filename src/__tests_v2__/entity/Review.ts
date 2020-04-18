import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";
import { Book } from "./Book";
import { ID, Field, ObjectType } from "type-graphql";

@ObjectType()
@Entity()
export class Review extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column("varchar")
  title!: string;

  @Field()
  @Column("varchar")
  body!: string;

  @Field()
  @Column("date")
  reviewDate!: string;

  @Field()
  @Column("int")
  rating!: number;

  @Field()
  @Column("varchar")
  reviewerName!: string;

  @Field(type => Book)
  @ManyToOne(
    type => Book,
    book => book.reviews
  )
  book!: Book;
}
