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
import { Field, ID, ObjectType } from "type-graphql";

@ObjectType()
@Entity()
export class Book extends BaseEntity {
  @Field(type => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column("varchar")
  title!: string;

  @Field()
  @Column("varchar")
  summary!: string;

  @Field()
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
