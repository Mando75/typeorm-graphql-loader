import { BaseEntity, Column, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Book } from "./Book";

export class Review extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column("varchar")
  title!: string;

  @Column("varchar")
  body!: string;

  @Column("date")
  reviewDate!: string;

  @Column("int")
  rating!: number;

  @Column("varchar")
  reviewerName!: string;

  @ManyToOne(
    type => Book,
    book => book.reviews
  )
  book!: Book;
}
