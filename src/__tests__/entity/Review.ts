import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";
import { Book } from "./Book";
import { Int, Field, ObjectType } from "type-graphql";
import { ConfigureLoader } from "../../decorator";

@ObjectType()
@Entity()
export class Review extends BaseEntity {
  @Field(type => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column("varchar")
  title!: string;

  @Field()
  @Column("text")
  body!: string;

  @Field(type => String)
  @Column("date")
  reviewDate!: Date;

  @Field()
  @Column("int")
  @ConfigureLoader({ required: true })
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
